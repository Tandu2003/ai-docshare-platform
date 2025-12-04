// For PDF to image conversion
import { ChildProcess, exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ImagePreviewService,
  OfficePreviewService,
  PdfPreviewService,
  PreviewUtilService,
  TextPreviewService,
} from './services';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PreviewStatus } from '@prisma/client';

export interface PreviewImage {
  id: string;
  documentId: string;
  pageNumber: number;
  previewUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  variants?: {
    small: string;
    medium: string;
    large: string;
  };
  metadata?: PreviewMetadata;
}

type PreviewSize = 'small' | 'medium' | 'large';

interface PreviewMetadata {
  pageCount: number;
  processingTimeMs: number;
  previewSizes: PreviewSize[];
  sourceType: 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE' | 'TEXT';
  textPreviewPath?: string;
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
  private readonly previewSizes: Record<PreviewSize, number> = {
    small: 200,
    medium: 800,
    large: 1200,
  };
  private readonly previewWidth = 800; // Preview image width (medium)
  private readonly previewQuality = 85; // JPEG quality
  private readonly shortSignedUrlExpiry = 30; // 30 seconds for preview images

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly configService: ConfigService,
    private readonly pdfPreviewService: PdfPreviewService,
    private readonly officePreviewService: OfficePreviewService,
    private readonly textPreviewService: TextPreviewService,
    private readonly imagePreviewService: ImagePreviewService,
    private readonly previewUtilService: PreviewUtilService,
  ) {}

  /**
   * Generate preview images for a document's first N pages
   * Supports PDF, DOC, DOCX, PPT, PPTX
   */
  async generatePreviews(documentId: string): Promise<PreviewGenerationResult> {
    this.logger.log(`Starting preview generation for document: ${documentId}`);
    const processingStart = Date.now();

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
            {
              processingStart,
              sourceType: 'IMAGE',
            },
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
      const sourceType = this.getSourceType(file.mimeType);
      let previews: PreviewImage[] = [];

      if (file.mimeType === 'application/pdf') {
        previews = await this.generatePdfPreviews(documentId, file, false, {
          processingStart,
          sourceType,
        });
      } else if (this.isOfficeFormat(file.mimeType)) {
        // Convert Office to PDF first, then generate previews
        previews = await this.generateOfficePreviews(documentId, file, {
          processingStart,
          sourceType,
        });
      } else if (this.isTextFormat(file.mimeType)) {
        // Generate preview from text file
        previews = await this.generateTextPreviews(documentId, file, {
          processingStart,
          sourceType,
        });
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
  async getDocumentPreviews(documentId: string): Promise<PreviewImage[]> {
    const previews = await this.prisma.documentPreview.findMany({
      where: {
        documentId,
        status: PreviewStatus.COMPLETED,
        mimeType: {
          startsWith: 'image/',
        },
        pageNumber: {
          gte: 1,
        },
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

        const parsedMetadata = this.parseMetadata(preview.errorMessage);
        const metadata = parsedMetadata ? { ...parsedMetadata } : undefined;
        if (metadata?.textPreviewPath) {
          try {
            metadata.textPreviewPath =
              await this.r2Service.getSignedDownloadUrl(
                metadata.textPreviewPath,
                this.shortSignedUrlExpiry,
              );
          } catch (err) {
            this.logger.warn(
              `Could not sign text preview URL: ${(err as Error).message}`,
            );
          }
        }
        const previewSizes =
          metadata?.previewSizes || (['medium'] as PreviewSize[]);
        const variantKeys: Partial<Record<PreviewSize, string>> = {
          medium: preview.previewPath,
        };

        if (previewSizes.includes('small')) {
          variantKeys.small = this.getVariantKey(preview.previewPath, 'small');
        }
        if (previewSizes.includes('large')) {
          variantKeys.large = this.getVariantKey(preview.previewPath, 'large');
        }

        const variants: {
          small: string;
          medium: string;
          large: string;
        } = {
          small:
            (variantKeys.small &&
              (await this.r2Service.getSignedDownloadUrl(
                variantKeys.small,
                this.shortSignedUrlExpiry,
              ))) ||
            signedUrl,
          medium: signedUrl,
          large:
            (variantKeys.large &&
              (await this.r2Service.getSignedDownloadUrl(
                variantKeys.large,
                this.shortSignedUrlExpiry,
              ))) ||
            signedUrl,
        };

        return {
          id: preview.id,
          documentId: preview.documentId,
          pageNumber: preview.pageNumber,
          previewUrl: signedUrl,
          mimeType: preview.mimeType,
          width: preview.width ?? undefined,
          height: preview.height ?? undefined,
          variants,
          metadata,
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
        mimeType: {
          startsWith: 'image/',
        },
        pageNumber: {
          gte: 1,
        },
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
    metadata?: PreviewMetadata;
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
        mimeType: {
          startsWith: 'image/',
        },
        pageNumber: {
          gte: 1,
        },
      },
    });

    const metadataPreview = await this.prisma.documentPreview.findFirst({
      where: {
        documentId,
        status: PreviewStatus.COMPLETED,
        mimeType: {
          startsWith: 'image/',
        },
        pageNumber: {
          gte: 1,
        },
      },
      orderBy: { pageNumber: 'asc' },
    });

    const metadata = this.parseMetadata(metadataPreview?.errorMessage);
    if (metadata?.textPreviewPath) {
      try {
        metadata.textPreviewPath = await this.r2Service.getSignedDownloadUrl(
          metadata.textPreviewPath,
          this.shortSignedUrlExpiry,
        );
      } catch (err) {
        this.logger.warn(
          `Could not sign text preview URL: ${(err as Error).message}`,
        );
      }
    }

    return {
      status: document.previewStatus,
      error: document.previewError ?? undefined,
      previewCount,
      metadata,
    };
  }

  /**
   * Generate preview from PDF file
   * @delegates PdfPreviewService.generatePdfPreviews
   */
  private async generatePdfPreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
    },
    isLocalFile: boolean = false,
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
    },
  ): Promise<PreviewImage[]> {
    return this.pdfPreviewService.generatePdfPreviews(
      documentId,
      file,
      isLocalFile,
      options,
    );
  }

  /**
   * Generate preview from Office documents (DOC, DOCX, PPT, PPTX)
   */
  /**
   * Generate preview from Office documents (DOC, DOCX, PPT, PPTX)
   * @delegates OfficePreviewService.generateOfficePreviews
   */
  private async generateOfficePreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
      mimeType: string;
    },
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
    },
  ): Promise<PreviewImage[]> {
    return this.officePreviewService.generateOfficePreviews(
      documentId,
      file,
      options,
    );
  }

  /**
   * Generate preview from text file (TXT, MD, CSV, etc.)
   * @delegates TextPreviewService.generateTextPreviews
   */
  private async generateTextPreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
      mimeType: string;
    },
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
    },
  ): Promise<PreviewImage[]> {
    return this.textPreviewService.generateTextPreviews(
      documentId,
      file,
      options,
    );
  }

  /**
   * Create preview from image file (image is its own preview)
   * @delegates ImagePreviewService.createImagePreview
   */
  private async createImagePreview(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
      mimeType: string;
    },
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
    },
  ): Promise<PreviewImage> {
    return this.imagePreviewService.createImagePreview(
      documentId,
      file,
      options,
    );
  }

  /**
   * Create placeholder previews when conversion fails
   * @delegates PdfPreviewService.createPlaceholderPreviews
   */
  private async createPlaceholderPreviews(
    documentId: string,
    fileName?: string,
    metadata?: PreviewMetadata,
  ): Promise<PreviewImage[]> {
    return this.pdfPreviewService.createPlaceholderPreviews(
      documentId,
      fileName,
      metadata,
    );
  }

  /**
   * Convert PDF page to image using pdftoppm or ImageMagick
   */
  private async convertPdfPageToImage(
    pdfPath: string,
    outputPath: string,
    pageNumber: number,
    targetWidth: number,
  ): Promise<boolean> {
    const basePath = outputPath.replace('.jpg', '');
    const pdftoppmCmd = `pdftoppm -f ${pageNumber} -l ${pageNumber} -jpeg -jpegopt quality=${this.previewQuality} -scale-to ${targetWidth} "${pdfPath}" "${basePath}"`;
    this.logger.debug(`Running pdftoppm: ${pdftoppmCmd}`);

    try {
      // Try pdftoppm first (from poppler-utils)
      const { stderr } = await this.runCommandWithTimeout(pdftoppmCmd, {
        logLabel: 'pdftoppm',
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

      // Fallback to ImageMagick (webp first as requested)
      const fallbackWebp = outputPath.replace(/\\.jpg$/i, '.webp');
      try {
        await this.runCommandWithTimeout(
          `convert "${pdfPath}[${pageNumber - 1}]" -resize ${this.previewSizes.medium}x "${fallbackWebp}"`,
          { logLabel: 'convert-webp-fallback' },
        );

        const fallbackExists = await this.fileExists(fallbackWebp);
        if (fallbackExists) {
          // Resize to target width (may upscale if needed)
          await this.resizeImage(fallbackWebp, outputPath, targetWidth);
          const converted = await this.fileExists(outputPath);
          if (converted) {
            return true;
          }
        }
      } catch (convertWebpError) {
        this.logger.warn(
          `ImageMagick webp fallback failed: ${convertWebpError.message}`,
        );
      }

      // Last fallback: direct convert to JPEG
      try {
        await this.runCommandWithTimeout(
          `convert -density 150 "${pdfPath}[${pageNumber - 1}]" -quality ${this.previewQuality} -resize ${targetWidth}x "${outputPath}"`,
          { logLabel: 'convert-jpeg-fallback' },
        );

        return await this.fileExists(outputPath);
      } catch (convertError) {
        this.logger.error(
          `ImageMagick conversion also failed: ${convertError.message}`,
        );
        return false;
      }
    }
  }

  private async convertPdfPageToVariants(
    pdfPath: string,
    tmpDir: string,
    pageNumber: number,
  ): Promise<Partial<Record<PreviewSize, string>>> {
    const variantPaths: Partial<Record<PreviewSize, string>> = {
      small: path.join(tmpDir, `preview-${pageNumber}-small.jpg`),
      medium: path.join(tmpDir, `preview-${pageNumber}.jpg`),
      large: path.join(tmpDir, `preview-${pageNumber}-large.jpg`),
    };

    // Try generating the largest size first, then downscale
    const largeOk = await this.convertPdfPageToImage(
      pdfPath,
      variantPaths.large as string,
      pageNumber,
      this.previewSizes.large,
    );

    if (largeOk) {
      const mediumOk = await this.resizeImage(
        variantPaths.large as string,
        variantPaths.medium as string,
        this.previewSizes.medium,
      );
      const smallOk = await this.resizeImage(
        variantPaths.large as string,
        variantPaths.small as string,
        this.previewSizes.small,
      );

      return {
        large: variantPaths.large,
        medium: mediumOk ? (variantPaths.medium as string) : undefined,
        small: smallOk ? (variantPaths.small as string) : undefined,
      };
    }

    // Try generating medium directly
    const mediumOk = await this.convertPdfPageToImage(
      pdfPath,
      variantPaths.medium as string,
      pageNumber,
      this.previewSizes.medium,
    );

    if (!mediumOk) {
      return {};
    }

    const smallOk = await this.resizeImage(
      variantPaths.medium as string,
      variantPaths.small as string,
      this.previewSizes.small,
    );

    const largeOkRetry = await this.resizeImage(
      variantPaths.medium as string,
      variantPaths.large as string,
      this.previewSizes.large,
    );

    return {
      medium: variantPaths.medium,
      small: smallOk ? (variantPaths.small as string) : undefined,
      large: largeOkRetry ? (variantPaths.large as string) : undefined,
    };
  }

  private async generatePdfTextPreview(
    documentId: string,
    pdfPath: string,
    tmpDir: string,
    metadata: PreviewMetadata,
  ): Promise<string | undefined> {
    const textOutput = path.join(tmpDir, 'text-preview.txt');
    try {
      await this.runCommandWithTimeout(
        `pdftotext -f 1 -l ${this.maxPreviewPages} "${pdfPath}" "${textOutput}"`,
        { logLabel: 'pdftotext' },
      );

      if (!(await this.fileExists(textOutput))) {
        return undefined;
      }

      const content = await fs.promises.readFile(textOutput, 'utf-8');
      if (!content) return undefined;

      const snippet = content.trim().slice(0, 500);
      const textSnippet =
        snippet.length >= 300 ? snippet : content.trim().slice(0, 300);
      if (!textSnippet) return undefined;

      const buffer = Buffer.from(textSnippet, 'utf-8');
      const key = `previews/${documentId}/text-preview.txt`;
      await this.r2Service.uploadBuffer(buffer, key, 'text/plain');

      const metadataWithText: PreviewMetadata = {
        ...metadata,
        textPreviewPath: key,
      };

      await this.prisma.documentPreview.upsert({
        where: {
          documentId_pageNumber: { documentId, pageNumber: 0 },
        },
        create: {
          documentId,
          pageNumber: 0,
          previewPath: key,
          mimeType: 'text/plain',
          fileSize: buffer.length,
          status: PreviewStatus.COMPLETED,
          errorMessage: JSON.stringify(metadataWithText),
        },
        update: {
          previewPath: key,
          mimeType: 'text/plain',
          fileSize: buffer.length,
          status: PreviewStatus.COMPLETED,
          errorMessage: JSON.stringify(metadataWithText),
        },
      });

      return key;
    } catch (error) {
      this.logger.warn(`pdftotext snippet failed: ${(error as Error).message}`);
      return undefined;
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
   * Run shell command with timeout, retries, and hard kill on hang
   */
  private async runCommandWithTimeout(
    command: string,
    options?: {
      timeoutMs?: number;
      retries?: number;
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      maxBuffer?: number;
      logLabel?: string;
    },
  ): Promise<{ stdout: string; stderr: string }> {
    const timeoutMs = options?.timeoutMs ?? 20000;
    const retries = options?.retries ?? 2;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      attempt++;
      const label = options?.logLabel || 'Command';
      const startedAt = Date.now();

      try {
        const result = await new Promise<{ stdout: string; stderr: string }>(
          (resolve, reject) => {
            let done = false;
            const child = exec(
              command,
              {
                cwd: options?.cwd,
                env: options?.env,
                maxBuffer: options?.maxBuffer ?? 50 * 1024 * 1024,
              },
              (error, stdout, stderr) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                if (error) {
                  reject(
                    new Error(
                      `${error.message}${
                        stderr ? `: ${stderr.trim()}` : ''
                      }`.trim(),
                    ),
                  );
                  return;
                }
                resolve({ stdout, stderr });
              },
            );

            const timer = setTimeout(() => {
              if (done) return;
              done = true;
              child.kill('SIGKILL');
              reject(new Error(`Command timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            child.on('error', err => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              reject(err);
            });
          },
        );

        this.logger.debug(
          `${label} succeeded in ${Date.now() - startedAt}ms (attempt ${attempt}/${retries + 1})`,
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `${label} failed (attempt ${attempt}/${retries + 1}): ${lastError.message}`,
        );
      }
    }

    throw lastError || new Error('Unknown command error');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    return fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  private getVariantKey(previewPath: string, size: PreviewSize): string {
    if (size === 'medium') return previewPath;
    const ext = path.extname(previewPath) || '.jpg';
    const base = previewPath.slice(0, -ext.length);
    return `${base}-${size}${ext}`;
  }

  private buildMetadata(params: {
    pageCount: number;
    processingStart?: number;
    sourceType: PreviewMetadata['sourceType'];
    previewSizes?: PreviewSize[];
    textPreviewPath?: string;
  }): PreviewMetadata {
    return {
      pageCount: params.pageCount,
      processingTimeMs: params.processingStart
        ? Date.now() - params.processingStart
        : 0,
      previewSizes: params.previewSizes || ['small', 'medium', 'large'],
      sourceType: params.sourceType,
      textPreviewPath: params.textPreviewPath,
    };
  }

  private parseMetadata(
    metadataString?: string | null,
  ): PreviewMetadata | undefined {
    if (!metadataString) return undefined;
    try {
      return JSON.parse(metadataString) as PreviewMetadata;
    } catch {
      return undefined;
    }
  }

  private async isCommandAvailable(command: string): Promise<boolean> {
    try {
      await this.runCommandWithTimeout(`command -v ${command}`, {
        logLabel: `check-${command}`,
        retries: 0,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async startSofficeDaemon(
    tmpDir: string,
  ): Promise<ChildProcess | null> {
    try {
      const child = spawn(
        'soffice',
        [
          '--headless',
          '--nologo',
          '--nofirststartwizard',
          '--norestore',
          '--nodefault',
          '--accept=socket,host=127.0.0.1,port=8100;urp;',
          `-env:UserInstallation=file://${tmpDir}/lo-profile`,
        ],
        {
          stdio: 'ignore',
        },
      );
      return child;
    } catch (error) {
      this.logger.warn(
        `Failed to start soffice daemon: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async resizeImage(
    inputPath: string,
    outputPath: string,
    width: number,
  ): Promise<boolean> {
    try {
      await this.runCommandWithTimeout(
        `convert "${inputPath}" -resize ${width}x -quality ${this.previewQuality} "${outputPath}"`,
        { logLabel: `resize-${width}` },
      );
      return await this.fileExists(outputPath);
    } catch (error) {
      this.logger.warn(
        `Resize failed (${width}px): ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async getPdfPageCount(pdfPath: string): Promise<number> {
    try {
      const { stdout } = await this.runCommandWithTimeout(
        `pdfinfo "${pdfPath}"`,
        { logLabel: 'pdfinfo' },
      );
      const match = stdout.match(/Pages:\\s+(\\d+)/i);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    } catch (error) {
      this.logger.warn(
        `pdfinfo failed for ${pdfPath}: ${(error as Error).message}`,
      );
    }
    return this.maxPreviewPages;
  }

  private getSourceType(mimeType: string): PreviewMetadata['sourceType'] {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (this.isTextFormat(mimeType)) return 'TEXT';
    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
      return 'PPTX';
    if (mimeType === 'application/vnd.ms-powerpoint') return 'PPTX';
    return 'DOCX';
  }

  /**
   * Get image dimensions from buffer (basic implementation)
   */
  private getImageDimensions(buffer: Buffer): {
    width?: number;
    height?: number;
  } {
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
        const keysToDelete = [preview.previewPath];
        if (preview.mimeType.startsWith('image/')) {
          const parsed = this.parseMetadata(preview.errorMessage);
          const sizes = parsed?.previewSizes || [];
          if (sizes.includes('small')) {
            keysToDelete.push(this.getVariantKey(preview.previewPath, 'small'));
          }
          if (sizes.includes('large')) {
            keysToDelete.push(this.getVariantKey(preview.previewPath, 'large'));
          }
        }

        for (const key of keysToDelete) {
          try {
            await this.r2Service.deleteFile(key);
          } catch {
            this.logger.warn(`Failed to delete preview file: ${key}`);
          }
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
