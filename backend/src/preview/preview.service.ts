// For PDF to image conversion
import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import {
  CloudinaryResourceType,
  CloudinaryService,
} from '../common/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PreviewStatus } from '@prisma/client';
import { UploadApiResponse } from 'cloudinary';

const execAsync = promisify(exec);

export interface PreviewImage {
  id: string;
  documentId: string;
  pageNumber: number;
  previewUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface PreviewGenerationResult {
  success: boolean;
  documentId: string;
  previews: PreviewImage[];
  totalPages: number;
  error?: string;
}

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private readonly maxPreviewPages = 3; // Generate previews for first 3 pages
  private readonly previewWidth = 800; // Preview image width
  private readonly previewQuality = 85; // JPEG quality for text previews
  private readonly shortSignedUrlExpiry = 30; // 30 seconds for preview images
  private readonly sourceUrlExpiry = 600; // 10 minutes for Cloudinary fetch
  private readonly previewFolder: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {
    this.previewFolder =
      this.configService.get<string>('CLOUDINARY_PREVIEW_FOLDER') ||
      'document-previews';
  }

  /**
   * Generate preview images for a document's first N pages
   * Supports PDF, DOC, DOCX, PPT, PPTX, images and text files
   */
  async generatePreviews(documentId: string): Promise<PreviewGenerationResult> {
    this.logger.log(`Starting preview generation for document: ${documentId}`);

    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: { file: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { previewStatus: PreviewStatus.PROCESSING, previewError: null },
      });

      const previewableFile = document.files.find(df =>
        this.isPreviewableFormat(df.file.mimeType),
      );

      if (!previewableFile) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            previewStatus: PreviewStatus.FAILED,
            previewError: 'No previewable files found',
          },
        });

        return {
          success: false,
          documentId,
          previews: [],
          totalPages: 0,
          error: 'No previewable files found in document',
        };
      }

      const file = previewableFile.file;
      let previews: PreviewImage[] = [];

      if (file.mimeType === 'application/pdf') {
        previews = await this.generatePdfPreviews(documentId, file);
      } else if (this.isOfficeFormat(file.mimeType)) {
        previews = await this.generateOfficePreviews(documentId, file);
      } else if (this.isTextFormat(file.mimeType)) {
        previews = await this.generateTextPreviews(documentId, file);
      } else if (file.mimeType.startsWith('image/')) {
        const preview = await this.createImagePreview(documentId, file);
        previews = [preview];
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { previewStatus: PreviewStatus.COMPLETED, previewError: null },
      });

      this.logger.log(
        `Preview generation completed for document ${documentId}: ${previews.length} previews`,
      );

      return {
        success: true,
        documentId,
        previews,
        totalPages: previews.length,
      };
    } catch (error) {
      this.logger.error(
        `Preview generation failed for document ${documentId}:`,
        error,
      );

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          previewStatus: PreviewStatus.FAILED,
          previewError: error.message,
        },
      });

      return {
        success: false,
        documentId,
        previews: [],
        totalPages: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get preview images for a document with short-lived signed URLs
   */
  async getDocumentPreviews(documentId: string): Promise<PreviewImage[]> {
    const previews = await this.prisma.documentPreview.findMany({
      where: {
        documentId,
        status: PreviewStatus.COMPLETED,
      },
      orderBy: { pageNumber: 'asc' },
    });

    const previewsWithUrls = await Promise.all(
      previews.map(async preview => {
        const previewUrl = await this.buildPreviewUrl(
          preview.previewPath,
          preview.pageNumber,
        );

        return {
          id: preview.id,
          documentId: preview.documentId,
          pageNumber: preview.pageNumber,
          previewUrl,
          mimeType: preview.mimeType,
          width: preview.width ?? undefined,
          height: preview.height ?? undefined,
        };
      }),
    );

    return previewsWithUrls;
  }

  /**
   * Get a single preview image with very short-lived signed URL
   */
  async getPreviewImage(
    documentId: string,
    pageNumber: number,
  ): Promise<{
    url: string;
    expiresAt: Date;
    mimeType: string;
  }> {
    const preview = await this.prisma.documentPreview.findUnique({
      where: {
        documentId_pageNumber: {
          documentId,
          pageNumber,
        },
      },
    });

    if (!preview || preview.status !== PreviewStatus.COMPLETED) {
      throw new NotFoundException('Preview not found');
    }

    const signedUrl = await this.buildPreviewUrl(
      preview.previewPath,
      pageNumber,
    );

    return {
      url: signedUrl,
      expiresAt: new Date(Date.now() + this.shortSignedUrlExpiry * 1000),
      mimeType: preview.mimeType,
    };
  }

  /**
   * Stream preview image directly (for secure access without exposing URL)
   */
  async streamPreviewImage(
    documentId: string,
    pageNumber: number,
  ): Promise<{
    stream: Readable;
    mimeType: string;
    contentLength?: number;
  }> {
    const preview = await this.prisma.documentPreview.findUnique({
      where: {
        documentId_pageNumber: {
          documentId,
          pageNumber,
        },
      },
    });

    if (!preview || preview.status !== PreviewStatus.COMPLETED) {
      throw new NotFoundException('Preview not found');
    }

    const cloudinaryRef = this.parseCloudinaryRef(preview.previewPath);

    if (cloudinaryRef) {
      const url = this.cloudinaryService.generatePreviewUrl(
        cloudinaryRef.publicId,
        pageNumber,
        {
          resourceType: cloudinaryRef.resourceType,
          width: this.previewWidth,
          expiresIn: this.shortSignedUrlExpiry,
          format: 'jpg',
        },
      );

      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new NotFoundException('Preview not available from Cloudinary');
      }

      const contentLengthHeader = response.headers.get('content-length');
      const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : undefined;

      return {
        stream: Readable.fromWeb(response.body as any),
        mimeType: preview.mimeType,
        contentLength,
      };
    }

    const stream = await this.r2Service.getFileStream(preview.previewPath);

    return {
      stream,
      mimeType: preview.mimeType,
      contentLength: preview.fileSize || undefined,
    };
  }

  /**
   * Check if previews exist for a document
   */
  async hasPreviewsReady(documentId: string): Promise<boolean> {
    const count = await this.prisma.documentPreview.count({
      where: {
        documentId,
        status: PreviewStatus.COMPLETED,
      },
    });
    return count > 0;
  }

  /**
   * Get preview generation status
   */
  async getPreviewStatus(documentId: string): Promise<{
    status: PreviewStatus;
    error?: string;
    previewCount: number;
  }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { previewStatus: true, previewError: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const previewCount = await this.prisma.documentPreview.count({
      where: {
        documentId,
        status: PreviewStatus.COMPLETED,
      },
    });

    return {
      status: document.previewStatus,
      error: document.previewError ?? undefined,
      previewCount,
    };
  }

  /**
   * Generate preview from PDF file using Cloudinary
   */
  private async generatePdfPreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
    },
    isLocalFile: boolean = false,
  ): Promise<PreviewImage[]> {
    this.logger.log(`Generating PDF previews for file: ${file.originalName}`);
    const sourceUrl = isLocalFile
      ? file.storageUrl
      : await this.ensureDownloadUrl(file.storageUrl);

    const uploadResult = await this.cloudinaryService.uploadFromSource(
      sourceUrl,
      {
        public_id: this.buildCloudinaryPublicId(documentId),
        folder: undefined,
        resource_type: 'auto',
        use_filename: false,
        unique_filename: false,
        invalidate: true,
        pages: true,
      },
    );

    return this.persistCloudinaryPreviews(documentId, uploadResult);
  }

  /**
   * Generate preview from Office documents (DOC, DOCX, PPT, PPTX)
   * Cloudinary first, fallback to LibreOffice->PDF
   */
  private async generateOfficePreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
      mimeType: string;
    },
  ): Promise<PreviewImage[]> {
    this.logger.log(
      `Generating Office previews for file: ${file.originalName} (${file.mimeType})`,
    );

    try {
      return await this.generatePdfPreviews(documentId, file);
    } catch (cloudError) {
      this.logger.warn(
        `Cloudinary could not generate previews directly for ${file.originalName}: ${cloudError.message}. Falling back to local conversion.`,
      );
    }

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'office-preview-'),
    );

    try {
      const ext = this.getExtensionFromMimeType(file.mimeType);
      const inputPath = path.join(tmpDir, `input${ext}`);

      const fileStream = await this.r2Service.getFileStream(file.storageUrl);
      await this.streamToFile(fileStream, inputPath);

      const pdfPath = await this.convertOfficeToPdf(inputPath, tmpDir);

      if (!pdfPath) {
        this.logger.error(
          `All conversion methods failed for: ${file.originalName}`,
        );
        return await this.createPlaceholderPreviews(documentId);
      }

      const pdfStats = await fs.promises.stat(pdfPath);
      this.logger.log(`Converted PDF size: ${pdfStats.size} bytes`);

      if (pdfStats.size === 0) {
        this.logger.error('Converted PDF is empty');
        return await this.createPlaceholderPreviews(documentId);
      }

      return await this.generatePdfPreviews(
        documentId,
        {
          id: file.id,
          storageUrl: pdfPath,
          originalName: 'converted.pdf',
        },
        true,
      );
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Generate preview from text file (TXT, MD, CSV, etc.)
   * Creates an image from the text content and uploads to Cloudinary
   */
  private async generateTextPreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
      mimeType: string;
    },
  ): Promise<PreviewImage[]> {
    this.logger.log(`Generating text preview for file: ${file.originalName}`);

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'text-preview-'),
    );

    try {
      const inputPath = path.join(tmpDir, 'input.txt');
      const fileStream = await this.r2Service.getFileStream(file.storageUrl);
      await this.streamToFile(fileStream, inputPath);

      let textContent = await fs.promises.readFile(inputPath, 'utf-8');

      if (textContent.length > 4000) {
        textContent =
          textContent.substring(0, 4000) +
          '\n\n... [Nội dung tiếp theo được rút gọn]';
      }

      const outputPath = path.join(tmpDir, 'preview-1.jpg');

      const escapedText = textContent
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

      try {
        await execAsync(
          `convert -size ${this.previewWidth}x1200 xc:white \
            -font "NimbusMonoPS-Regular" -pointsize 14 -fill black \
            -gravity NorthWest -annotate +20+20 "${escapedText}" \
            -trim +repage -bordercolor white -border 20 \
            -quality ${this.previewQuality} "${outputPath}"`,
          {
            timeout: 30000,
            maxBuffer: 50 * 1024 * 1024,
          },
        );
      } catch (convertError) {
        this.logger.warn(
          `ImageMagick text conversion failed: ${convertError.message}`,
        );
        try {
          const wrappedText = this.wrapText(textContent, 80);
          const textFilePath = path.join(tmpDir, 'wrapped.txt');
          await fs.promises.writeFile(textFilePath, wrappedText);

          await execAsync(
            `convert -size ${this.previewWidth}x -background white \
              -fill black -font "NimbusMonoPS-Regular" -pointsize 14 \
              caption:@"${textFilePath}" \
              -bordercolor white -border 20 \
              -quality ${this.previewQuality} "${outputPath}"`,
            { timeout: 30000 },
          );
        } catch (fallbackError) {
          this.logger.error(
            `Fallback text conversion also failed: ${fallbackError.message}`,
          );
          return await this.createPlaceholderPreviews(documentId);
        }
      }

      const outputExists = await fs.promises
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (!outputExists) {
        throw new Error('Text preview image was not created');
      }

      const imageBuffer = await fs.promises.readFile(outputPath);
      const { width, height } = this.getImageDimensions(imageBuffer);

      const uploadResult = await this.cloudinaryService.uploadImageBuffer(
        imageBuffer,
        {
          public_id: this.buildCloudinaryPublicId(documentId),
          resource_type: 'image',
          invalidate: true,
          use_filename: false,
          unique_filename: false,
        },
      );

      const previewPath = this.buildCloudinaryRef(
        uploadResult.public_id,
        (uploadResult.resource_type as CloudinaryResourceType) || 'image',
      );

      const preview = await this.prisma.documentPreview.upsert({
        where: {
          documentId_pageNumber: { documentId, pageNumber: 1 },
        },
        create: {
          documentId,
          pageNumber: 1,
          previewPath,
          mimeType: 'image/jpeg',
          fileSize: imageBuffer.length,
          width,
          height,
          status: PreviewStatus.COMPLETED,
        },
        update: {
          previewPath,
          fileSize: imageBuffer.length,
          width,
          height,
          status: PreviewStatus.COMPLETED,
          errorMessage: null,
        },
      });

      const signedUrl = this.cloudinaryService.generatePreviewUrl(
        uploadResult.public_id,
        1,
        {
          resourceType:
            (uploadResult.resource_type as CloudinaryResourceType) || 'image',
          width: this.previewWidth,
          expiresIn: this.shortSignedUrlExpiry,
          format: 'jpg',
        },
      );

      return [
        {
          id: preview.id,
          documentId,
          pageNumber: 1,
          previewUrl: signedUrl,
          mimeType: 'image/jpeg',
          width,
          height,
        },
      ];
    } catch (error) {
      this.logger.error(`Text preview generation failed: ${error.message}`);
      return await this.createPlaceholderPreviews(documentId);
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Create preview from image file using Cloudinary transformations
   */
  private async createImagePreview(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
      mimeType: string;
    },
  ): Promise<PreviewImage> {
    this.logger.log(`Creating image preview for file: ${file.originalName}`);

    const sourceUrl = await this.ensureDownloadUrl(file.storageUrl);
    const uploadResult = await this.cloudinaryService.uploadFromSource(
      sourceUrl,
      {
        public_id: this.buildCloudinaryPublicId(documentId),
        resource_type: 'auto',
        invalidate: true,
        use_filename: false,
        unique_filename: false,
      },
    );

    const previewPath = this.buildCloudinaryRef(
      uploadResult.public_id,
      (uploadResult.resource_type as CloudinaryResourceType) || 'image',
    );

    const preview = await this.prisma.documentPreview.upsert({
      where: {
        documentId_pageNumber: { documentId, pageNumber: 1 },
      },
      create: {
        documentId,
        pageNumber: 1,
        previewPath,
        mimeType: 'image/jpeg',
        status: PreviewStatus.COMPLETED,
      },
      update: {
        previewPath,
        mimeType: 'image/jpeg',
        status: PreviewStatus.COMPLETED,
        errorMessage: null,
      },
    });

    const previewUrl = this.cloudinaryService.generatePreviewUrl(
      uploadResult.public_id,
      1,
      {
        resourceType:
          (uploadResult.resource_type as CloudinaryResourceType) || 'image',
        width: this.previewWidth,
        expiresIn: this.shortSignedUrlExpiry,
        format: 'jpg',
      },
    );

    return {
      id: preview.id,
      documentId,
      pageNumber: 1,
      previewUrl,
      mimeType: 'image/jpeg',
      width: uploadResult.width,
      height: uploadResult.height,
    };
  }

  /**
   * Create placeholder previews when conversion fails
   */
  private async createPlaceholderPreviews(
    documentId: string,
  ): Promise<PreviewImage[]> {
    await this.prisma.documentPreview.upsert({
      where: {
        documentId_pageNumber: { documentId, pageNumber: 1 },
      },
      create: {
        documentId,
        pageNumber: 1,
        previewPath: 'placeholder',
        mimeType: 'image/png',
        status: PreviewStatus.FAILED,
        errorMessage: 'Preview generation not supported for this format',
      },
      update: {
        status: PreviewStatus.FAILED,
        errorMessage: 'Preview generation not supported for this format',
      },
    });

    return [];
  }

  /**
   * Persist Cloudinary previews for the first pages
   */
  private async persistCloudinaryPreviews(
    documentId: string,
    uploadResult: UploadApiResponse,
  ): Promise<PreviewImage[]> {
    const resourceType =
      (uploadResult.resource_type as CloudinaryResourceType) || 'image';
    const previewPath = this.buildCloudinaryRef(
      uploadResult.public_id,
      resourceType,
    );

    const totalPages = Math.min(
      uploadResult.pages && uploadResult.pages > 0 ? uploadResult.pages : 1,
      this.maxPreviewPages,
    );

    const previews: PreviewImage[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const signedUrl = this.cloudinaryService.generatePreviewUrl(
        uploadResult.public_id,
        page,
        {
          resourceType,
          width: this.previewWidth,
          expiresIn: this.shortSignedUrlExpiry,
          format: 'jpg',
          version: uploadResult.version,
        },
      );

      const preview = await this.prisma.documentPreview.upsert({
        where: {
          documentId_pageNumber: { documentId, pageNumber: page },
        },
        create: {
          documentId,
          pageNumber: page,
          previewPath,
          mimeType: 'image/jpeg',
          fileSize: uploadResult.bytes ?? 0,
          width: this.previewWidth,
          status: PreviewStatus.COMPLETED,
        },
        update: {
          previewPath,
          fileSize: uploadResult.bytes ?? 0,
          width: this.previewWidth,
          status: PreviewStatus.COMPLETED,
          errorMessage: null,
        },
      });

      previews.push({
        id: preview.id,
        documentId,
        pageNumber: page,
        previewUrl: signedUrl,
        mimeType: 'image/jpeg',
        width: this.previewWidth,
      });
    }

    return previews;
  }

  /**
   * Convert Office document to PDF using LibreOffice/unoconv
   */
  private async convertOfficeToPdf(
    inputPath: string,
    tmpDir: string,
  ): Promise<string | null> {
    // Approach 1: Standard conversion with HOME set to tmpDir
    try {
      const { stdout, stderr } = await execAsync(
        `soffice --headless --nofirststartwizard --norestore --nologo --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`,
        {
          timeout: 120000,
          env: {
            ...process.env,
            HOME: tmpDir,
            TMPDIR: tmpDir,
          },
        },
      );
      this.logger.log(`LibreOffice stdout: ${stdout}`);
      if (stderr) this.logger.warn(`LibreOffice stderr: ${stderr}`);

      const expectedPdf = path.join(tmpDir, 'input.pdf');
      const pdfExists = await fs.promises
        .access(expectedPdf)
        .then(() => true)
        .catch(() => false);

      if (pdfExists) {
        return expectedPdf;
      }

      const files = await fs.promises.readdir(tmpDir);
      const pdfFile = files.find(f => f.endsWith('.pdf'));
      if (pdfFile) {
        return path.join(tmpDir, pdfFile);
      }
    } catch (loError) {
      this.logger.warn(
        `LibreOffice conversion attempt 1 failed: ${loError.message}`,
      );
    }

    // Approach 2: Alternative options
    try {
      const { stdout, stderr } = await execAsync(
        `libreoffice --headless --invisible --convert-to pdf:writer_pdf_Export --outdir "${tmpDir}" "${inputPath}"`,
        {
          timeout: 120000,
          env: {
            ...process.env,
            HOME: tmpDir,
            TMPDIR: tmpDir,
            SAL_USE_VCLPLUGIN: 'svp',
          },
        },
      );
      this.logger.log(`LibreOffice (alt) stdout: ${stdout}`);
      if (stderr) this.logger.warn(`LibreOffice (alt) stderr: ${stderr}`);

      const files = await fs.promises.readdir(tmpDir);
      const pdfFile = files.find(f => f.endsWith('.pdf'));
      if (pdfFile) {
        return path.join(tmpDir, pdfFile);
      }
    } catch (loError2) {
      this.logger.warn(
        `LibreOffice conversion attempt 2 failed: ${loError2.message}`,
      );
    }

    // Approach 3: unoconv
    try {
      const unoconvOutput = path.join(tmpDir, 'output.pdf');
      await execAsync(`unoconv -f pdf -o "${unoconvOutput}" "${inputPath}"`, {
        timeout: 120000,
      });
      const pdfExists = await fs.promises
        .access(unoconvOutput)
        .then(() => true)
        .catch(() => false);
      if (pdfExists) {
        return unoconvOutput;
      }
    } catch (unoError) {
      this.logger.warn(`unoconv conversion failed: ${unoError.message}`);
    }

    return null;
  }

  /**
   * Helper to write stream to file
   */
  private async streamToFile(
    stream: Readable,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  /**
   * Get image dimensions from buffer (basic implementation)
   */
  private getImageDimensions(buffer: Buffer): {
    width?: number;
    height?: number;
  } {
    try {
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let i = 2;
        while (i < buffer.length) {
          if (buffer[i] !== 0xff) break;
          const marker = buffer[i + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(i + 2);
          i += 2 + length;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return {};
  }

  /**
   * Wrap text to specified width
   */
  private wrapText(text: string, maxWidth: number): string {
    const lines = text.split('\n');
    const wrappedLines: string[] = [];

    for (const line of lines) {
      if (line.length <= maxWidth) {
        wrappedLines.push(line);
      } else {
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
          if ((currentLine + ' ' + word).trim().length <= maxWidth) {
            currentLine = (currentLine + ' ' + word).trim();
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) wrappedLines.push(currentLine);
      }
    }

    return wrappedLines.join('\n');
  }

  /**
   * Check if mime type is previewable
   */
  private isPreviewableFormat(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      this.isOfficeFormat(mimeType) ||
      mimeType.startsWith('image/') ||
      this.isTextFormat(mimeType)
    );
  }

  /**
   * Check if mime type is text format
   */
  private isTextFormat(mimeType: string): boolean {
    const textFormats = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'text/xml',
      'application/json',
      'application/xml',
    ];
    return textFormats.includes(mimeType) || mimeType.startsWith('text/');
  }

  /**
   * Check if mime type is Office format
   */
  private isOfficeFormat(mimeType: string): boolean {
    const officeFormats = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return officeFormats.includes(mimeType);
  }

  /**
   * Get file extension from mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'application/pdf': '.pdf',
    };
    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Delete previews for a document
   */
  async deletePreviews(documentId: string): Promise<void> {
    const previews = await this.prisma.documentPreview.findMany({
      where: { documentId },
    });

    const cloudinaryRefs = new Set<string>();

    for (const preview of previews) {
      const cloudRef = this.parseCloudinaryRef(preview.previewPath);
      if (cloudRef) {
        cloudinaryRefs.add(`${cloudRef.resourceType}::${cloudRef.publicId}`);
        continue;
      }

      if (
        preview.previewPath &&
        preview.previewPath !== 'placeholder' &&
        !preview.previewPath.startsWith('uploads/')
      ) {
        try {
          await this.r2Service.deleteFile(preview.previewPath);
        } catch {
          this.logger.warn(
            `Failed to delete legacy preview file: ${preview.previewPath}`,
          );
        }
      }
    }

    for (const ref of cloudinaryRefs) {
      const [resourceType, publicId] = ref.split('::');
      try {
        await this.cloudinaryService.deleteAsset(
          publicId,
          (resourceType as CloudinaryResourceType) || 'auto',
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete Cloudinary asset ${publicId}: ${error.message}`,
        );
      }
    }

    await this.prisma.documentPreview.deleteMany({
      where: { documentId },
    });
  }

  /**
   * Regenerate previews for a document
   */
  async regeneratePreviews(
    documentId: string,
  ): Promise<PreviewGenerationResult> {
    await this.deletePreviews(documentId);
    return await this.generatePreviews(documentId);
  }

  /**
   * Build signed preview URL depending on storage backend
   */
  private async buildPreviewUrl(
    previewPath: string,
    pageNumber: number,
  ): Promise<string> {
    const cloudinaryRef = this.parseCloudinaryRef(previewPath);

    if (cloudinaryRef) {
      return this.cloudinaryService.generatePreviewUrl(
        cloudinaryRef.publicId,
        pageNumber,
        {
          resourceType: cloudinaryRef.resourceType,
          width: this.previewWidth,
          expiresIn: this.shortSignedUrlExpiry,
          format: 'jpg',
        },
      );
    }

    return this.r2Service.getSignedDownloadUrl(
      previewPath,
      this.shortSignedUrlExpiry,
    );
  }

  /**
   * Build Cloudinary ref string to keep type + id together
   */
  private buildCloudinaryRef(
    publicId: string,
    resourceType: CloudinaryResourceType,
  ): string {
    return `cloudinary:${resourceType}:${publicId}`;
  }

  /**
   * Parse Cloudinary ref string
   */
  private parseCloudinaryRef(previewPath: string): {
    publicId: string;
    resourceType: CloudinaryResourceType;
  } | null {
    if (!previewPath.startsWith('cloudinary:')) return null;
    const parts = previewPath.split(':');
    if (parts.length < 3) return null;
    const resourceType =
      (parts[1] as CloudinaryResourceType) ||
      ('image' as CloudinaryResourceType);
    const publicId = parts.slice(2).join(':');
    return { publicId, resourceType };
  }

  /**
   * Build unique Cloudinary public id for previews
   */
  private buildCloudinaryPublicId(documentId: string): string {
    const timestamp = Date.now();
    return `${this.previewFolder}/${documentId}/preview-${timestamp}`;
  }

  /**
   * Ensure we have a downloadable URL for Cloudinary
   */
  private async ensureDownloadUrl(
    storageUrl: string,
    expiresIn: number = this.sourceUrlExpiry,
  ): Promise<string> {
    if (storageUrl.startsWith('http')) {
      // Still sign to keep access bounded
      try {
        return await this.r2Service.getSignedDownloadUrl(storageUrl, expiresIn);
      } catch {
        return storageUrl;
      }
    }

    return await this.r2Service.getSignedDownloadUrl(storageUrl, expiresIn);
  }
}
