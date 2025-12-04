/**
 * PDF Preview Generator Service
 *
 * Handles PDF-specific preview generation:
 * - Convert PDF pages to images using pdftoppm/ImageMagick
 * - Generate multiple size variants
 * - Extract text preview from PDF
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudflareR2Service } from '../../common/cloudflare-r2.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FileInfo,
  MAX_PREVIEW_PAGES,
  PREVIEW_QUALITY,
  PREVIEW_SIZES,
  PreviewGenerationOptions,
  PreviewImage,
  PreviewMetadata,
  PreviewSize,
  SHORT_SIGNED_URL_EXPIRY,
} from '../interfaces';
import { PreviewUtilService } from './preview-util.service';
import { Injectable, Logger } from '@nestjs/common';
import { PreviewStatus } from '@prisma/client';

@Injectable()
export class PdfPreviewService {
  private readonly logger = new Logger(PdfPreviewService.name);
  private readonly maxPreviewPages = MAX_PREVIEW_PAGES;
  private readonly previewSizes = PREVIEW_SIZES;
  private readonly previewQuality = PREVIEW_QUALITY;
  private readonly shortSignedUrlExpiry = SHORT_SIGNED_URL_EXPIRY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly utilService: PreviewUtilService,
  ) {}

  /**
   * Generate previews from PDF file
   */
  async generatePdfPreviews(
    documentId: string,
    file: FileInfo,
    isLocalFile = false,
    options?: PreviewGenerationOptions,
  ): Promise<PreviewImage[]> {
    this.logger.log(`Generating PDF previews for file: ${file.originalName}`);

    let tmpDir: string;
    let shouldCleanup = true;

    if (isLocalFile) {
      tmpDir = path.dirname(file.storageUrl);
      shouldCleanup = false;
    } else {
      tmpDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'pdf-preview-'),
      );
    }

    try {
      let pdfPath: string;

      if (isLocalFile) {
        pdfPath = file.storageUrl;
      } else {
        pdfPath = path.join(tmpDir, 'input.pdf');
        const pdfStream = await this.r2Service.getFileStream(file.storageUrl);
        await this.utilService.streamToFile(pdfStream, pdfPath);
      }

      const pdfExists = await this.utilService.fileExists(pdfPath);
      if (!pdfExists) {
        throw new Error(`PDF file not found at: ${pdfPath}`);
      }

      const pageCount = await this.getPdfPageCount(pdfPath);
      const baseMetadata = this.utilService.buildMetadata({
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

      const previews: PreviewImage[] = [];
      const totalPages = Math.min(this.maxPreviewPages, pageCount);

      for (let page = 1; page <= totalPages; page++) {
        try {
          const preview = await this.generatePagePreview(
            documentId,
            pdfPath,
            tmpDir,
            page,
            pageCount,
            textPreviewPath,
            options,
          );

          if (preview) {
            previews.push(preview);
          } else if (page === 1) {
            return await this.createPlaceholderPreviews(
              documentId,
              file.originalName,
              options,
            );
          } else {
            break;
          }
        } catch (pageError) {
          this.logger.warn(
            `Error generating preview for page ${page}: ${(pageError as Error).message}`,
          );
          if (page === 1) {
            return await this.createPlaceholderPreviews(
              documentId,
              file.originalName,
              options,
            );
          }
          break;
        }
      }

      return previews;
    } finally {
      if (shouldCleanup) {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Generate preview for a single page
   */
  private async generatePagePreview(
    documentId: string,
    pdfPath: string,
    tmpDir: string,
    page: number,
    pageCount: number,
    textPreviewPath?: string,
    options?: PreviewGenerationOptions,
  ): Promise<PreviewImage | null> {
    const variantPaths = await this.convertPdfPageToVariants(
      pdfPath,
      tmpDir,
      page,
    );

    const availableSizes = Object.entries(variantPaths)
      .filter(([, value]) => !!value)
      .map(([size]) => size as PreviewSize);

    const mediumPath =
      variantPaths.medium || variantPaths.large || variantPaths.small;

    if (!mediumPath) {
      return null;
    }

    const imageBuffer = await fs.promises.readFile(mediumPath);
    const { width, height } = this.utilService.getImageDimensions(imageBuffer);

    const previewKey = `previews/${documentId}/page-${page}.jpg`;
    await this.r2Service.uploadBuffer(imageBuffer, previewKey, 'image/jpeg');

    const variantKeys: Partial<Record<PreviewSize, string>> = {
      medium: previewKey,
    };

    if (variantPaths.small) {
      const smallBuffer = await fs.promises.readFile(variantPaths.small);
      const smallKey = this.utilService.getVariantKey(previewKey, 'small');
      await this.r2Service.uploadBuffer(smallBuffer, smallKey, 'image/jpeg');
      variantKeys.small = smallKey;
    }

    if (variantPaths.large) {
      const largeBuffer = await fs.promises.readFile(variantPaths.large);
      const largeKey = this.utilService.getVariantKey(previewKey, 'large');
      await this.r2Service.uploadBuffer(largeBuffer, largeKey, 'image/jpeg');
      variantKeys.large = largeKey;
    }

    const metadata = this.utilService.buildMetadata({
      pageCount,
      previewSizes:
        availableSizes.length > 0
          ? (Array.from(
              new Set([...availableSizes, 'medium']),
            ) as PreviewSize[])
          : ['small', 'medium', 'large'],
      processingStart: options?.processingStart,
      sourceType: options?.sourceType ?? 'PDF',
      textPreviewPath,
    });

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

    const signedUrl = await this.r2Service.getSignedDownloadUrl(
      previewKey,
      this.shortSignedUrlExpiry,
    );

    const variants = {
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
      pageNumber: page,
      previewUrl: signedUrl,
      mimeType: 'image/jpeg',
      width,
      height,
      variants,
      metadata,
    };
  }

  /**
   * Convert PDF page to multiple size variants
   */
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

    const largeOk = await this.convertPdfPageToImage(
      pdfPath,
      variantPaths.large as string,
      pageNumber,
      this.previewSizes.large,
    );

    if (largeOk) {
      const mediumOk = await this.utilService.resizeImage(
        variantPaths.large as string,
        variantPaths.medium as string,
        this.previewSizes.medium,
      );
      const smallOk = await this.utilService.resizeImage(
        variantPaths.large as string,
        variantPaths.small as string,
        this.previewSizes.small,
      );

      return {
        large: variantPaths.large,
        medium: mediumOk ? variantPaths.medium : undefined,
        small: smallOk ? variantPaths.small : undefined,
      };
    }

    const mediumOk = await this.convertPdfPageToImage(
      pdfPath,
      variantPaths.medium as string,
      pageNumber,
      this.previewSizes.medium,
    );

    if (!mediumOk) {
      return {};
    }

    const smallOk = await this.utilService.resizeImage(
      variantPaths.medium as string,
      variantPaths.small as string,
      this.previewSizes.small,
    );

    const largeOkRetry = await this.utilService.resizeImage(
      variantPaths.medium as string,
      variantPaths.large as string,
      this.previewSizes.large,
    );

    return {
      medium: variantPaths.medium,
      small: smallOk ? variantPaths.small : undefined,
      large: largeOkRetry ? variantPaths.large : undefined,
    };
  }

  /**
   * Convert a single PDF page to image
   */
  private async convertPdfPageToImage(
    pdfPath: string,
    outputPath: string,
    pageNumber: number,
    targetWidth: number,
  ): Promise<boolean> {
    const basePath = outputPath.replace('.jpg', '');
    const pdftoppmCmd = `pdftoppm -f ${pageNumber} -l ${pageNumber} -jpeg -jpegopt quality=${this.previewQuality} -scale-to ${targetWidth} "${pdfPath}" "${basePath}"`;

    try {
      const { stderr } = await this.utilService.runCommandWithTimeout(
        pdftoppmCmd,
        { logLabel: 'pdftoppm' },
      );

      if (stderr) {
        this.logger.debug(`pdftoppm stderr: ${stderr}`);
      }

      const possiblePaths = [
        `${basePath}-${pageNumber}.jpg`,
        `${basePath}-0${pageNumber}.jpg`,
        `${basePath}-00${pageNumber}.jpg`,
        `${basePath}-${String(pageNumber).padStart(2, '0')}.jpg`,
        `${basePath}-${String(pageNumber).padStart(3, '0')}.jpg`,
      ];

      let foundPath: string | null = null;
      for (const possiblePath of possiblePaths) {
        if (await this.utilService.fileExists(possiblePath)) {
          foundPath = possiblePath;
          break;
        }
      }

      const outputExists = await this.utilService.fileExists(outputPath);

      if (foundPath && foundPath !== outputPath) {
        await fs.promises.rename(foundPath, outputPath);
        return true;
      } else if (outputExists) {
        return true;
      }

      // Try finding any jpg file
      const dir = path.dirname(basePath);
      const files = await fs.promises.readdir(dir);
      const basename = path.basename(basePath);
      const jpgFile = files.find(
        f => f.startsWith(basename) && f.endsWith('.jpg'),
      );

      if (jpgFile) {
        const jpgPath = path.join(dir, jpgFile);
        await fs.promises.rename(jpgPath, outputPath);
        return true;
      }

      return false;
    } catch (pdftoppmError) {
      this.logger.warn(`pdftoppm failed: ${(pdftoppmError as Error).message}`);

      // Fallback to ImageMagick
      try {
        await this.utilService.runCommandWithTimeout(
          `convert -density 150 "${pdfPath}[${pageNumber - 1}]" -quality ${this.previewQuality} -resize ${targetWidth}x "${outputPath}"`,
          { logLabel: 'convert-jpeg-fallback' },
        );

        return await this.utilService.fileExists(outputPath);
      } catch (convertError) {
        this.logger.error(
          `ImageMagick conversion also failed: ${(convertError as Error).message}`,
        );
        return false;
      }
    }
  }

  /**
   * Generate text preview from PDF
   */
  private async generatePdfTextPreview(
    documentId: string,
    pdfPath: string,
    tmpDir: string,
    metadata: PreviewMetadata,
  ): Promise<string | undefined> {
    const textOutput = path.join(tmpDir, 'text-preview.txt');

    try {
      await this.utilService.runCommandWithTimeout(
        `pdftotext -f 1 -l ${this.maxPreviewPages} "${pdfPath}" "${textOutput}"`,
        { logLabel: 'pdftotext' },
      );

      if (!(await this.utilService.fileExists(textOutput))) {
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
   * Get PDF page count using pdfinfo
   */
  private async getPdfPageCount(pdfPath: string): Promise<number> {
    try {
      const { stdout } = await this.utilService.runCommandWithTimeout(
        `pdfinfo "${pdfPath}"`,
        { logLabel: 'pdfinfo' },
      );
      const match = stdout.match(/Pages:\s+(\d+)/i);
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

  /**
   * Create placeholder previews when conversion fails
   */
  async createPlaceholderPreviews(
    documentId: string,
    fileName?: string,
    options?: PreviewGenerationOptions,
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
      this.utilService.getVariantKey(baseKey, 'small'),
      this.utilService.getVariantKey(baseKey, 'large'),
    ];

    for (const key of keys) {
      await this.r2Service.uploadBuffer(buffer, key, 'image/svg+xml');
    }

    const metadata = options
      ? this.utilService.buildMetadata({
          pageCount: 0,
          processingStart: options.processingStart,
          sourceType: options.sourceType ?? 'PDF',
        })
      : undefined;

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
}
