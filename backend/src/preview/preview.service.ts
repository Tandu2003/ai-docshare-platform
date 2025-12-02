// For PDF to image conversion
import { ChildProcess, exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaService } from '../prisma/prisma.service';
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
   */
  private async generatePdfPreviews(
    documentId: string,
    file: {
      id: string;
      storageUrl: string;
      originalName: string;
    },
    isLocalFile: boolean = false, // Flag to indicate if storageUrl is a local path
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
    },
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

      const pageCount = await this.getPdfPageCount(pdfPath);
      const baseMetadata = this.buildMetadata({
        pageCount,
        processingStart: options?.processingStart,
        sourceType: options?.sourceType ?? 'PDF',
      });

      let textPreviewPath: string | undefined;
      try {
        textPreviewPath = await this.generatePdfTextPreview(
          documentId,
          pdfPath,
          tmpDir,
          baseMetadata,
        );
      } catch (textError) {
        this.logger.warn(
          `pdftotext failed for ${file.originalName}: ${(textError as Error).message}`,
        );
      }

      // Convert PDF pages to images using pdftoppm (from poppler-utils)
      // Fallback to ImageMagick if pdftoppm is not available
      const previews: PreviewImage[] = [];

      const totalPages = Math.min(this.maxPreviewPages, pageCount);

      for (let page = 1; page <= totalPages; page++) {
        try {
          const variantPaths = await this.convertPdfPageToVariants(
            pdfPath,
            tmpDir,
            page,
          );

          const availableSizes = Object.entries(variantPaths)
            .filter(([, value]) => !!value)
            .map(([size]) => size as PreviewSize);

          const mediumPath =
            variantPaths.medium ||
            variantPaths.large ||
            variantPaths.small;

          if (!mediumPath) {
            this.logger.warn(
              `Failed to convert page ${page} of ${file.originalName}`,
            );
            if (page === 1) {
              const placeholderMetadata = this.buildMetadata({
                pageCount: 0,
                processingStart: options?.processingStart,
                sourceType: options?.sourceType ?? 'PDF',
              });
              return await this.createPlaceholderPreviews(
                documentId,
                file.originalName,
                placeholderMetadata,
              );
            }
            break; // Stop if page doesn't exist
          }

          // Read the generated image
          const imageBuffer = await fs.promises.readFile(mediumPath);
          const { width, height } = this.getImageDimensions(imageBuffer);

          // Upload to R2
          const previewKey = `previews/${documentId}/page-${page}.jpg`;
          await this.r2Service.uploadBuffer(
            imageBuffer,
            previewKey,
            'image/jpeg',
          );

          const variantKeys: Partial<Record<PreviewSize, string>> = {
            medium: previewKey,
          };

          if (variantPaths.small) {
            const smallBuffer = await fs.promises.readFile(
              variantPaths.small,
            );
            const smallKey = this.getVariantKey(previewKey, 'small');
            await this.r2Service.uploadBuffer(
              smallBuffer,
              smallKey,
              'image/jpeg',
            );
            variantKeys.small = smallKey;
          }

          if (variantPaths.large) {
            const largeBuffer = await fs.promises.readFile(
              variantPaths.large,
            );
            const largeKey = this.getVariantKey(previewKey, 'large');
            await this.r2Service.uploadBuffer(
              largeBuffer,
              largeKey,
              'image/jpeg',
            );
            variantKeys.large = largeKey;
          }

          const metadata = this.buildMetadata({
            pageCount,
            previewSizes:
              availableSizes.length > 0
                ? (Array.from(
                    new Set([...availableSizes, 'medium']),
                  ) as PreviewSize[])
                : baseMetadata.previewSizes,
            processingStart: options?.processingStart,
            sourceType: options?.sourceType ?? 'PDF',
            textPreviewPath,
          });

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
              errorMessage: JSON.stringify(metadata),
            },
            update: {
              previewPath: previewKey,
              fileSize: imageBuffer.length,
              width,
              height,
              status: PreviewStatus.COMPLETED,
              errorMessage: JSON.stringify(metadata),
            },
          });

          // Generate signed URL
          const signedUrl = await this.r2Service.getSignedDownloadUrl(
            previewKey,
            this.shortSignedUrlExpiry,
          );

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

          previews.push({
            id: preview.id,
            documentId,
            pageNumber: page,
            previewUrl: signedUrl,
            mimeType: 'image/jpeg',
            width,
            height,
            variants,
            metadata,
          });
        } catch (pageError) {
          this.logger.warn(
            `Error generating preview for page ${page}: ${pageError.message}`,
          );
          // Stop if we can't generate more pages (likely reached end of document)
          if (page === 1) {
            const placeholderMetadata = this.buildMetadata({
              pageCount: 0,
              processingStart: options?.processingStart,
              sourceType: options?.sourceType ?? 'PDF',
            });
            return await this.createPlaceholderPreviews(
              documentId,
              file.originalName,
              placeholderMetadata,
            );
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
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
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

      // Approach 1: Unoconv with soffice daemon if available
      const unoconvAvailable = await this.isCommandAvailable('unoconv');
      if (unoconvAvailable) {
        this.logger.log('Trying unoconv conversion (daemon mode)...');
        const unoconvOutput = path.join(tmpDir, 'output.pdf');
        try {
          await this.runCommandWithTimeout(
            `unoconv --port=8100 -f pdf -o "${unoconvOutput}" "${inputPath}"`,
            { logLabel: 'unoconv' },
          );
          if (await this.fileExists(unoconvOutput)) {
            pdfPath = unoconvOutput;
            this.logger.log(`unoconv created PDF at: ${pdfPath}`);
          }
        } catch (unoError) {
          this.logger.warn(`unoconv conversion failed: ${unoError.message}`);

          // Try to start soffice daemon then retry
          const daemon = await this.startSofficeDaemon(tmpDir);
          if (daemon) {
            await this.delay(1200);
            try {
              await this.runCommandWithTimeout(
                `unoconv --port=8100 -f pdf -o "${unoconvOutput}" "${inputPath}"`,
                { logLabel: 'unoconv-daemon' },
              );
              if (await this.fileExists(unoconvOutput)) {
                pdfPath = unoconvOutput;
                this.logger.log(`unoconv (daemon) created PDF at: ${pdfPath}`);
              }
            } catch (unoRetryError) {
              this.logger.warn(
                `unoconv with daemon failed: ${unoRetryError.message}`,
              );
            } finally {
              try {
                daemon.kill('SIGKILL');
              } catch {
                // ignore
              }
            }
          }
        }
      }

      // Approach 2: Standard conversion with HOME set to tmpDir
      if (!pdfPath) {
        try {
          const { stdout, stderr } = await this.runCommandWithTimeout(
            `soffice --headless --nofirststartwizard --norestore --nologo --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`,
            {
              logLabel: 'soffice-convert',
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
          const pdfExists = await this.fileExists(expectedPdf);

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
      }

      // Approach 3: Try with different options if first attempt failed
      if (!pdfPath) {
        try {
          this.logger.log('Trying alternative LibreOffice conversion...');
          const { stdout, stderr } = await this.runCommandWithTimeout(
            `libreoffice --headless --invisible --convert-to pdf:writer_pdf_Export --outdir "${tmpDir}" "${inputPath}"`,
            {
              logLabel: 'libreoffice-alt',
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

      // Approach 4: Try unoconv without daemon if not already tried
      if (!pdfPath) {
        const unoconvOutput = path.join(tmpDir, 'output.pdf');
        try {
          this.logger.log('Trying unoconv conversion (no daemon)...');
          await this.runCommandWithTimeout(
            `unoconv -f pdf -o "${unoconvOutput}" "${inputPath}"`,
            { logLabel: 'unoconv-last' },
          );
          if (await this.fileExists(unoconvOutput)) {
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
        const placeholderMetadata = this.buildMetadata({
          pageCount: 0,
          processingStart: options?.processingStart,
          sourceType: options?.sourceType ?? this.getSourceType(file.mimeType),
        });
        return await this.createPlaceholderPreviews(
          documentId,
          file.originalName,
          placeholderMetadata,
        );
      }

      // Verify PDF file is valid
      const pdfStats = await fs.promises.stat(pdfPath);
      this.logger.log(`PDF file size: ${pdfStats.size} bytes`);

      if (pdfStats.size === 0) {
        this.logger.error('Converted PDF is empty');
        const placeholderMetadata = this.buildMetadata({
          pageCount: 0,
          processingStart: options?.processingStart,
          sourceType: options?.sourceType ?? this.getSourceType(file.mimeType),
        });
        return await this.createPlaceholderPreviews(
          documentId,
          file.originalName,
          placeholderMetadata,
        );
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
        {
          processingStart: options?.processingStart,
          sourceType: options?.sourceType ?? this.getSourceType(file.mimeType),
        },
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
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
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
        await this.runCommandWithTimeout(
          `convert -size ${this.previewWidth}x1200 xc:white \
            -font "NimbusMonoPS-Regular" -pointsize 14 -fill black \
            -gravity NorthWest -annotate +20+20 "${escapedText}" \
            -trim +repage -bordercolor white -border 20 \
            -quality ${this.previewQuality} "${outputPath}"`,
          {
            maxBuffer: 50 * 1024 * 1024,
            logLabel: 'convert-text',
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

          await this.runCommandWithTimeout(
            `convert -size ${this.previewWidth}x -background white \
              -fill black -font "NimbusMonoPS-Regular" -pointsize 14 \
              caption:@"${textFilePath}" \
              -bordercolor white -border 20 \
              -quality ${this.previewQuality} "${outputPath}"`,
            { logLabel: 'convert-text-fallback' },
          );
        } catch (fallbackError) {
          this.logger.error(
            `Fallback text conversion also failed: ${fallbackError.message}`,
          );
          const placeholderMetadata = this.buildMetadata({
            pageCount: 0,
            processingStart: options?.processingStart,
            sourceType: options?.sourceType ?? 'TEXT',
          });
          return await this.createPlaceholderPreviews(
            documentId,
            file.originalName,
            placeholderMetadata,
          );
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
      const { width, height } = this.getImageDimensions(imageBuffer);

      // Upload to R2
      const previewKey = `previews/${documentId}/page-1.jpg`;
      await this.r2Service.uploadBuffer(imageBuffer, previewKey, 'image/jpeg');

      const smallPath = path.join(tmpDir, 'preview-1-small.jpg');
      const largePath = path.join(tmpDir, 'preview-1-large.jpg');
      const smallCreated = await this.resizeImage(
        outputPath,
        smallPath,
        this.previewSizes.small,
      );
      const largeCreated = await this.resizeImage(
        outputPath,
        largePath,
        this.previewSizes.large,
      );

      const variantKeys: Partial<Record<PreviewSize, string>> = {
        medium: previewKey,
      };

      if (smallCreated) {
        const smallBuffer = await fs.promises.readFile(smallPath);
        const smallKey = this.getVariantKey(previewKey, 'small');
        await this.r2Service.uploadBuffer(
          smallBuffer,
          smallKey,
          'image/jpeg',
        );
        variantKeys.small = smallKey;
      }

      if (largeCreated) {
        const largeBuffer = await fs.promises.readFile(largePath);
        const largeKey = this.getVariantKey(previewKey, 'large');
        await this.r2Service.uploadBuffer(
          largeBuffer,
          largeKey,
          'image/jpeg',
        );
        variantKeys.large = largeKey;
      }

      const availableSizes: PreviewSize[] = (
        Object.keys(variantKeys) as PreviewSize[]
      ).filter(Boolean);

      const metadata = this.buildMetadata({
        pageCount: 1,
        processingStart: options?.processingStart,
        sourceType: options?.sourceType ?? 'TEXT',
        previewSizes: availableSizes.length
          ? availableSizes
          : ['small', 'medium', 'large'],
      });

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
          errorMessage: JSON.stringify(metadata),
        },
        update: {
          previewPath: previewKey,
          fileSize: imageBuffer.length,
          width,
          height,
          status: PreviewStatus.COMPLETED,
          errorMessage: JSON.stringify(metadata),
        },
      });

      // Generate signed URL
      const signedUrl = await this.r2Service.getSignedDownloadUrl(
        previewKey,
        this.shortSignedUrlExpiry,
      );

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

      return [
        {
          id: preview.id,
          documentId,
          pageNumber: 1,
          previewUrl: signedUrl,
          mimeType: 'image/jpeg',
          width,
          height,
          variants,
          metadata,
        },
      ];
    } catch (error) {
      this.logger.error(`Text preview generation failed: ${error.message}`);
      const placeholderMetadata = this.buildMetadata({
        pageCount: 0,
        processingStart: options?.processingStart,
        sourceType: options?.sourceType ?? 'TEXT',
      });
      return await this.createPlaceholderPreviews(
        documentId,
        file.originalName,
        placeholderMetadata,
      );
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
    options?: {
      processingStart?: number;
      sourceType?: PreviewMetadata['sourceType'];
    },
  ): Promise<PreviewImage> {
    this.logger.log(`Creating image preview for file: ${file.originalName}`);

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'image-preview-'),
    );

    try {
      const inputPath = path.join(tmpDir, 'input');
      const inputStream = await this.r2Service.getFileStream(file.storageUrl);
      await this.streamToFile(inputStream, inputPath);

      const mediumPath = path.join(tmpDir, 'preview-1.jpg');
      const smallPath = path.join(tmpDir, 'preview-1-small.jpg');
      const largePath = path.join(tmpDir, 'preview-1-large.jpg');

      let mediumReady = await this.resizeImage(
        inputPath,
        mediumPath,
        this.previewSizes.medium,
      );

      // If resize failed, fall back to original file
      if (!mediumReady && (await this.fileExists(inputPath))) {
        await fs.promises.copyFile(inputPath, mediumPath);
        mediumReady = true;
      }

      const smallReady = mediumReady
        ? await this.resizeImage(mediumPath, smallPath, this.previewSizes.small)
        : false;
      const largeReady = await this.resizeImage(
        inputPath,
        largePath,
        this.previewSizes.large,
      );

      const mediumPathToUse = mediumReady ? mediumPath : inputPath;
      const imageBuffer = await fs.promises.readFile(mediumPathToUse);
      const { width, height } = this.getImageDimensions(imageBuffer);

      const previewKey = `previews/${documentId}/page-1.jpg`;
      await this.r2Service.uploadBuffer(imageBuffer, previewKey, 'image/jpeg');

      const variantKeys: Partial<Record<PreviewSize, string>> = {
        medium: previewKey,
      };

      if (smallReady) {
        const smallBuffer = await fs.promises.readFile(smallPath);
        const smallKey = this.getVariantKey(previewKey, 'small');
        await this.r2Service.uploadBuffer(
          smallBuffer,
          smallKey,
          'image/jpeg',
        );
        variantKeys.small = smallKey;
      }

      if (largeReady) {
        const largeBuffer = await fs.promises.readFile(largePath);
        const largeKey = this.getVariantKey(previewKey, 'large');
        await this.r2Service.uploadBuffer(
          largeBuffer,
          largeKey,
          'image/jpeg',
        );
        variantKeys.large = largeKey;
      }

      const availableSizes: PreviewSize[] = (
        Object.keys(variantKeys) as PreviewSize[]
      ).filter(Boolean);

      const metadata = this.buildMetadata({
        pageCount: 1,
        processingStart: options?.processingStart,
        sourceType: options?.sourceType ?? 'IMAGE',
        previewSizes: availableSizes.length
          ? availableSizes
          : ['small', 'medium', 'large'],
      });

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
          errorMessage: JSON.stringify(metadata),
        },
        update: {
          previewPath: previewKey,
          mimeType: 'image/jpeg',
          fileSize: imageBuffer.length,
          width,
          height,
          status: PreviewStatus.COMPLETED,
          errorMessage: JSON.stringify(metadata),
        },
      });

      const signedUrl = await this.r2Service.getSignedDownloadUrl(
        previewKey,
        this.shortSignedUrlExpiry,
      );

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
        documentId,
        pageNumber: 1,
        previewUrl: signedUrl,
        mimeType: 'image/jpeg',
        width,
        height,
        variants,
        metadata,
      };
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Create placeholder previews when conversion fails
   */
  private async createPlaceholderPreviews(
    documentId: string,
    fileName?: string,
    metadata?: PreviewMetadata,
  ): Promise<PreviewImage[]> {
    const safeName = (fileName || 'Document').slice(0, 80);
    const escapedName = safeName
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f3f4f6"/>
      <stop offset="100%" stop-color="#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#4b5563">Preview unavailable</text>
  <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">${escapedName}</text>
</svg>`;
    const buffer = Buffer.from(svg, 'utf-8');
    const baseKey = `previews/${documentId}/placeholder.svg`;

    const keys = [
      baseKey,
      this.getVariantKey(baseKey, 'small'),
      this.getVariantKey(baseKey, 'large'),
    ];

    for (const key of keys) {
      await this.r2Service.uploadBuffer(buffer, key, 'image/svg+xml');
    }

    const errorMessage = metadata
      ? JSON.stringify(metadata)
      : 'Preview generation not supported for this format';

    const preview = await this.prisma.documentPreview.upsert({
      where: {
        documentId_pageNumber: { documentId, pageNumber: 1 },
      },
      create: {
        documentId,
        pageNumber: 1,
        previewPath: baseKey,
        mimeType: 'image/svg+xml',
        status: PreviewStatus.COMPLETED,
        errorMessage,
      },
      update: {
        previewPath: baseKey,
        mimeType: 'image/svg+xml',
        status: PreviewStatus.COMPLETED,
        errorMessage,
      },
    });

    const signedUrl = await this.r2Service.getSignedDownloadUrl(
      baseKey,
      this.shortSignedUrlExpiry,
    );

    return [
      {
        id: preview.id,
        documentId,
        pageNumber: 1,
        previewUrl: signedUrl,
        mimeType: 'image/svg+xml',
        variants: {
          small: signedUrl,
          medium: signedUrl,
          large: signedUrl,
        },
      },
    ];
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
      this.logger.warn(
        `pdftotext snippet failed: ${(error as Error).message}`,
      );
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

  private async startSofficeDaemon(tmpDir: string): Promise<ChildProcess | null> {
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

  private getSourceType(
    mimeType: string,
  ): PreviewMetadata['sourceType'] {
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
