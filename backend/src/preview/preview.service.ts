// For PDF to image conversion
import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PreviewStatus } from '@prisma/client';
import * as pdfParse from 'pdf-parse';

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
  private readonly previewQuality = 85; // JPEG quality
  private readonly shortSignedUrlExpiry = 30; // 30 seconds for preview images

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate preview images for a document's first N pages
   * Supports PDF, DOC, DOCX, PPT, PPTX
   */
  async generatePreviews(documentId: string): Promise<PreviewGenerationResult> {
    this.logger.log(`Starting preview generation for document: ${documentId}`);

    try {
      // Get document with files
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

      // Update status to processing
      await this.prisma.document.update({
        where: { id: documentId },
        data: { previewStatus: PreviewStatus.PROCESSING },
      });

      // Find the first previewable file (PDF, DOC, DOCX, PPT, PPTX)
      const previewableFile = document.files.find(df => {
        const mimeType = df.file.mimeType;
        return this.isPreviewableFormat(mimeType);
      });

      if (!previewableFile) {
        // No previewable file, check for images
        const imageFile = document.files.find(df =>
          df.file.mimeType.startsWith('image/'),
        );

        if (imageFile) {
          // Use the image itself as preview
          const preview = await this.createImagePreview(
            documentId,
            imageFile.file,
          );
          await this.prisma.document.update({
            where: { id: documentId },
            data: { previewStatus: PreviewStatus.COMPLETED },
          });
          return {
            success: true,
            documentId,
            previews: [preview],
            totalPages: 1,
          };
        }

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

      // Generate previews based on file type
      const file = previewableFile.file;
      let previews: PreviewImage[] = [];

      if (file.mimeType === 'application/pdf') {
        previews = await this.generatePdfPreviews(documentId, file);
      } else if (this.isOfficeFormat(file.mimeType)) {
        // Convert Office to PDF first, then generate previews
        previews = await this.generateOfficePreviews(documentId, file);
      } else if (this.isTextFormat(file.mimeType)) {
        // Generate preview from text file
        previews = await this.generateTextPreviews(documentId, file);
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { previewStatus: PreviewStatus.COMPLETED },
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
  async getDocumentPreviews(
    documentId: string,
    userId?: string,
  ): Promise<PreviewImage[]> {
    const previews = await this.prisma.documentPreview.findMany({
      where: {
        documentId,
        status: PreviewStatus.COMPLETED,
      },
      orderBy: { pageNumber: 'asc' },
    });

    // Generate short-lived signed URLs (30 seconds)
    const previewsWithUrls = await Promise.all(
      previews.map(async preview => {
        const signedUrl = await this.r2Service.getSignedDownloadUrl(
          preview.previewPath,
          this.shortSignedUrlExpiry, // 30 seconds
        );
        return {
          id: preview.id,
          documentId: preview.documentId,
          pageNumber: preview.pageNumber,
          previewUrl: signedUrl,
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

    const signedUrl = await this.r2Service.getSignedDownloadUrl(
      preview.previewPath,
      this.shortSignedUrlExpiry,
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
   * Generate preview from PDF file
   */
  private async generatePdfPreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
    },
    isLocalFile: boolean = false, // Flag to indicate if storageUrl is a local path
  ): Promise<PreviewImage[]> {
    this.logger.log(`Generating PDF previews for file: ${file.originalName}`);

    // If isLocalFile, use the parent directory of the file as tmpDir
    // Otherwise, create a new temp directory
    let tmpDir: string;
    let shouldCleanup = true;

    if (isLocalFile) {
      // Use the directory containing the local file
      tmpDir = path.dirname(file.storageUrl);
      shouldCleanup = false; // Don't cleanup - parent function will handle it
    } else {
      tmpDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pdf-preview-'),
      );
    }

    try {
      // Get PDF file - either from local path or download from R2
      let pdfPath: string;

      if (isLocalFile) {
        // storageUrl is already a local file path
        pdfPath = file.storageUrl;
      } else {
        // Download PDF from R2
        pdfPath = path.join(tmpDir, 'input.pdf');
        const pdfStream = await this.r2Service.getFileStream(file.storageUrl);
        await this.streamToFile(pdfStream, pdfPath);
      }

      // Verify PDF file exists
      const pdfExists = await fs.promises
        .access(pdfPath)
        .then(() => true)
        .catch(() => false);
      if (!pdfExists) {
        throw new Error(`PDF file not found at: ${pdfPath}`);
      }

      // Convert PDF pages to images using pdftoppm (from poppler-utils)
      // Fallback to ImageMagick if pdftoppm is not available
      const previews: PreviewImage[] = [];

      for (let page = 1; page <= this.maxPreviewPages; page++) {
        try {
          const outputPath = path.join(tmpDir, `preview-${page}.jpg`);

          // Try pdftoppm first (faster and better quality)
          const success = await this.convertPdfPageToImage(
            pdfPath,
            outputPath,
            page,
          );

          if (!success) {
            this.logger.warn(
              `Failed to convert page ${page} of ${file.originalName}`,
            );
            break; // Stop if page doesn't exist
          }

          // Read the generated image
          const imageBuffer = await fs.promises.readFile(outputPath);
          const { width, height } = await this.getImageDimensions(imageBuffer);

          // Upload to R2
          const previewKey = `previews/${documentId}/page-${page}.jpg`;
          const storageUrl = await this.r2Service.uploadBuffer(
            imageBuffer,
            previewKey,
            'image/jpeg',
          );

          // Save to database
          const preview = await this.prisma.documentPreview.upsert({
            where: {
              documentId_pageNumber: { documentId, pageNumber: page },
            },
            create: {
              documentId,
              pageNumber: page,
              previewPath: previewKey,
              mimeType: 'image/jpeg',
              fileSize: imageBuffer.length,
              width,
              height,
              status: PreviewStatus.COMPLETED,
            },
            update: {
              previewPath: previewKey,
              fileSize: imageBuffer.length,
              width,
              height,
              status: PreviewStatus.COMPLETED,
              errorMessage: null,
            },
          });

          // Generate signed URL
          const signedUrl = await this.r2Service.getSignedDownloadUrl(
            previewKey,
            this.shortSignedUrlExpiry,
          );

          previews.push({
            id: preview.id,
            documentId,
            pageNumber: page,
            previewUrl: signedUrl,
            mimeType: 'image/jpeg',
            width,
            height,
          });
        } catch (pageError) {
          this.logger.warn(
            `Error generating preview for page ${page}: ${pageError.message}`,
          );
          // Stop if we can't generate more pages (likely reached end of document)
          if (page === 1) {
            throw pageError; // If first page fails, throw error
          }
          break;
        }
      }

      return previews;
    } finally {
      // Only cleanup temp directory if we created it (not for local files from Office conversion)
      if (shouldCleanup) {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Generate preview from Office documents (DOC, DOCX, PPT, PPTX)
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
    this.logger.log(`Storage URL: ${file.storageUrl}`);

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'office-preview-'),
    );

    try {
      // Download file from R2
      const ext = this.getExtensionFromMimeType(file.mimeType);
      const inputPath = path.join(tmpDir, `input${ext}`);

      this.logger.log(`Downloading file from R2 to: ${inputPath}`);

      try {
        const fileStream = await this.r2Service.getFileStream(file.storageUrl);
        await this.streamToFile(fileStream, inputPath);
      } catch (downloadError) {
        this.logger.error(
          `Failed to download file from R2: ${downloadError.message}`,
        );
        throw new Error(`Cannot download file: ${downloadError.message}`);
      }

      // Verify file was downloaded
      const fileStats = await fs.promises.stat(inputPath);
      this.logger.log(`Downloaded file size: ${fileStats.size} bytes`);

      if (fileStats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Convert to PDF using LibreOffice
      this.logger.log('Starting LibreOffice conversion...');

      // Try multiple conversion approaches
      let pdfPath: string | null = null;

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

        // LibreOffice outputs to input.pdf (same base name)
        const expectedPdf = path.join(tmpDir, 'input.pdf');
        const pdfExists = await fs.promises
          .access(expectedPdf)
          .then(() => true)
          .catch(() => false);

        if (pdfExists) {
          pdfPath = expectedPdf;
          this.logger.log(`PDF created at: ${pdfPath}`);
        } else {
          // List files in tmpDir to debug
          const files = await fs.promises.readdir(tmpDir);
          this.logger.log(`Files in tmpDir: ${files.join(', ')}`);

          // Try to find any PDF file
          const pdfFile = files.find(f => f.endsWith('.pdf'));
          if (pdfFile) {
            pdfPath = path.join(tmpDir, pdfFile);
            this.logger.log(`Found PDF at: ${pdfPath}`);
          }
        }
      } catch (loError) {
        this.logger.warn(
          `LibreOffice conversion attempt 1 failed: ${loError.message}`,
        );
      }

      // Approach 2: Try with different options if first attempt failed
      if (!pdfPath) {
        try {
          this.logger.log('Trying alternative LibreOffice conversion...');
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
            pdfPath = path.join(tmpDir, pdfFile);
            this.logger.log(`Found PDF at: ${pdfPath}`);
          }
        } catch (loError2) {
          this.logger.warn(
            `LibreOffice conversion attempt 2 failed: ${loError2.message}`,
          );
        }
      }

      // Approach 3: Try unoconv if available
      if (!pdfPath) {
        try {
          this.logger.log('Trying unoconv conversion...');
          const unoconvOutput = path.join(tmpDir, 'output.pdf');
          await execAsync(
            `unoconv -f pdf -o "${unoconvOutput}" "${inputPath}"`,
            {
              timeout: 120000,
            },
          );
          const pdfExists = await fs.promises
            .access(unoconvOutput)
            .then(() => true)
            .catch(() => false);
          if (pdfExists) {
            pdfPath = unoconvOutput;
            this.logger.log(`unoconv created PDF at: ${pdfPath}`);
          }
        } catch (unoError) {
          this.logger.warn(`unoconv conversion failed: ${unoError.message}`);
        }
      }

      // If all conversion attempts failed
      if (!pdfPath) {
        this.logger.error(
          `All conversion methods failed for: ${file.originalName}`,
        );
        return await this.createPlaceholderPreviews(documentId, file);
      }

      // Verify PDF file is valid
      const pdfStats = await fs.promises.stat(pdfPath);
      this.logger.log(`PDF file size: ${pdfStats.size} bytes`);

      if (pdfStats.size === 0) {
        this.logger.error('Converted PDF is empty');
        return await this.createPlaceholderPreviews(documentId, file);
      }

      // Now generate previews from the PDF (local file)
      return await this.generatePdfPreviews(
        documentId,
        {
          id: file.id,
          storageUrl: pdfPath, // Local path to converted PDF
          originalName: 'converted.pdf',
        },
        true, // isLocalFile = true
      );
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Generate preview from text file (TXT, MD, CSV, etc.)
   * Creates an image from the text content
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
      // Download text file from R2
      const inputPath = path.join(tmpDir, 'input.txt');
      const fileStream = await this.r2Service.getFileStream(file.storageUrl);
      await this.streamToFile(fileStream, inputPath);

      // Read text content
      let textContent = await fs.promises.readFile(inputPath, 'utf-8');

      // Truncate if too long (keep first ~4000 characters for preview)
      if (textContent.length > 4000) {
        textContent =
          textContent.substring(0, 4000) +
          '\n\n... [Nội dung tiếp theo được rút gọn]';
      }

      // Create image from text using ImageMagick
      const outputPath = path.join(tmpDir, 'preview-1.jpg');

      // Escape special characters for shell and prepare formatted text
      const escapedText = textContent
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

      try {
        // Use ImageMagick to create image from text
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
        // Fallback: Try simpler convert command
        try {
          // Write text to file and use pango
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
          return await this.createPlaceholderPreviews(documentId, file);
        }
      }

      // Check if output exists
      const outputExists = await fs.promises
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (!outputExists) {
        throw new Error('Text preview image was not created');
      }

      // Read the generated image
      const imageBuffer = await fs.promises.readFile(outputPath);
      const { width, height } = await this.getImageDimensions(imageBuffer);

      // Upload to R2
      const previewKey = `previews/${documentId}/page-1.jpg`;
      await this.r2Service.uploadBuffer(imageBuffer, previewKey, 'image/jpeg');

      // Save to database
      const preview = await this.prisma.documentPreview.upsert({
        where: {
          documentId_pageNumber: { documentId, pageNumber: 1 },
        },
        create: {
          documentId,
          pageNumber: 1,
          previewPath: previewKey,
          mimeType: 'image/jpeg',
          fileSize: imageBuffer.length,
          width,
          height,
          status: PreviewStatus.COMPLETED,
        },
        update: {
          previewPath: previewKey,
          fileSize: imageBuffer.length,
          width,
          height,
          status: PreviewStatus.COMPLETED,
          errorMessage: null,
        },
      });

      // Generate signed URL
      const signedUrl = await this.r2Service.getSignedDownloadUrl(
        previewKey,
        this.shortSignedUrlExpiry,
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
      return await this.createPlaceholderPreviews(documentId, file);
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
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
   * Create preview from image file (image is its own preview)
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

    // For images, we can just create a reference to the original
    // or create a resized thumbnail

    const preview = await this.prisma.documentPreview.upsert({
      where: {
        documentId_pageNumber: { documentId, pageNumber: 1 },
      },
      create: {
        documentId,
        pageNumber: 1,
        previewPath: file.storageUrl,
        mimeType: file.mimeType,
        status: PreviewStatus.COMPLETED,
      },
      update: {
        previewPath: file.storageUrl,
        mimeType: file.mimeType,
        status: PreviewStatus.COMPLETED,
        errorMessage: null,
      },
    });

    const signedUrl = await this.r2Service.getSignedDownloadUrl(
      file.storageUrl,
      this.shortSignedUrlExpiry,
    );

    return {
      id: preview.id,
      documentId,
      pageNumber: 1,
      previewUrl: signedUrl,
      mimeType: file.mimeType,
    };
  }

  /**
   * Create placeholder previews when conversion fails
   */
  private async createPlaceholderPreviews(
    documentId: string,
    file: { originalName: string; mimeType: string },
  ): Promise<PreviewImage[]> {
    // Mark as completed but with no actual images
    // Frontend will show a placeholder
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
   * Convert PDF page to image using pdftoppm or ImageMagick
   */
  private async convertPdfPageToImage(
    pdfPath: string,
    outputPath: string,
    pageNumber: number,
  ): Promise<boolean> {
    const basePath = outputPath.replace('.jpg', '');
    const pdftoppmCmd = `pdftoppm -f ${pageNumber} -l ${pageNumber} -jpeg -jpegopt quality=${this.previewQuality} -scale-to ${this.previewWidth} "${pdfPath}" "${basePath}"`;
    this.logger.debug(`Running pdftoppm: ${pdftoppmCmd}`);

    try {
      // Try pdftoppm first (from poppler-utils)
      const { stdout, stderr } = await execAsync(pdftoppmCmd, {
        timeout: 30000,
      });

      if (stderr) {
        this.logger.debug(`pdftoppm stderr: ${stderr}`);
      }

      // pdftoppm uses different naming conventions based on total pages:
      // - Single digit pages: preview-1.jpg, preview-2.jpg
      // - Two digit pages: preview-01.jpg, preview-02.jpg, preview-10.jpg
      // - Three digit pages: preview-001.jpg, preview-010.jpg, preview-100.jpg
      // Try all possible patterns
      const possiblePaths = [
        `${basePath}-${pageNumber}.jpg`, // preview-1.jpg
        `${basePath}-0${pageNumber}.jpg`, // preview-01.jpg
        `${basePath}-00${pageNumber}.jpg`, // preview-001.jpg
        `${basePath}-${String(pageNumber).padStart(2, '0')}.jpg`, // preview-01.jpg (zero-padded)
        `${basePath}-${String(pageNumber).padStart(3, '0')}.jpg`, // preview-001.jpg (zero-padded)
      ];

      let foundPath: string | null = null;
      for (const possiblePath of possiblePaths) {
        const exists = await fs.promises
          .access(possiblePath)
          .then(() => true)
          .catch(() => false);
        if (exists) {
          foundPath = possiblePath;
          break;
        }
      }

      this.logger.debug(
        `pdftoppm output check: searching for patterns near ${basePath}, found=${foundPath || 'none'}`,
      );

      // Also check if outputPath already exists (direct match)
      const outputExists = await fs.promises
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (foundPath && foundPath !== outputPath) {
        await fs.promises.rename(foundPath, outputPath);
        this.logger.debug(`Renamed ${foundPath} -> ${outputPath}`);
        return true;
      } else if (outputExists) {
        return true;
      }

      // If nothing found, try listing directory to see what was created
      try {
        const dir = path.dirname(basePath);
        const files = await fs.promises.readdir(dir);
        const basename = path.basename(basePath);
        const relatedFiles = files.filter(f => f.startsWith(basename));
        this.logger.debug(
          `Files in ${dir} starting with ${basename}: ${relatedFiles.join(', ') || 'none'}`,
        );

        // Try to rename the first matching jpg file
        const jpgFile = relatedFiles.find(f => f.endsWith('.jpg'));
        if (jpgFile) {
          const jpgPath = path.join(dir, jpgFile);
          await fs.promises.rename(jpgPath, outputPath);
          this.logger.debug(`Found and renamed ${jpgPath} -> ${outputPath}`);
          return true;
        }
      } catch {
        // Ignore readdir errors
      }

      this.logger.warn(
        `pdftoppm succeeded but output file not found at: ${outputPath}`,
      );
      return false;
    } catch (pdftoppmError) {
      this.logger.warn(`pdftoppm failed: ${pdftoppmError.message}`);

      // Fallback to ImageMagick
      try {
        await execAsync(
          `convert -density 150 "${pdfPath}[${pageNumber - 1}]" -quality ${this.previewQuality} -resize ${this.previewWidth}x "${outputPath}"`,
          { timeout: 30000 },
        );

        return await fs.promises
          .access(outputPath)
          .then(() => true)
          .catch(() => false);
      } catch (convertError) {
        this.logger.error(
          `ImageMagick conversion also failed: ${convertError.message}`,
        );
        return false;
      }
    }
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
  private async getImageDimensions(
    buffer: Buffer,
  ): Promise<{ width?: number; height?: number }> {
    // Simple JPEG dimension extraction
    // For production, use a proper image library
    try {
      // Check for JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let i = 2;
        while (i < buffer.length) {
          if (buffer[i] !== 0xff) break;
          const marker = buffer[i + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            // SOF0 or SOF2
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
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

    // Delete from R2
    for (const preview of previews) {
      if (
        preview.previewPath &&
        preview.previewPath !== 'placeholder' &&
        !preview.previewPath.startsWith('uploads/')
      ) {
        try {
          await this.r2Service.deleteFile(preview.previewPath);
        } catch (error) {
          this.logger.warn(
            `Failed to delete preview file: ${preview.previewPath}`,
          );
        }
      }
    }

    // Delete from database
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
}
