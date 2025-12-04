/**
 * Text Preview Generator Service
 *
 * Handles text file preview generation (TXT, MD, CSV, etc.):
 * - Create image from text content using ImageMagick
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudflareR2Service } from '../../common/cloudflare-r2.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FileInfo,
  PREVIEW_QUALITY,
  PREVIEW_SIZES,
  PreviewGenerationOptions,
  PreviewImage,
  PreviewSize,
  SHORT_SIGNED_URL_EXPIRY,
} from '../interfaces';
import { PdfPreviewService } from './pdf-preview.service';
import { PreviewUtilService } from './preview-util.service';
import { Injectable, Logger } from '@nestjs/common';
import { PreviewStatus } from '@prisma/client';

@Injectable()
export class TextPreviewService {
  private readonly logger = new Logger(TextPreviewService.name);
  private readonly previewSizes = PREVIEW_SIZES;
  private readonly previewQuality = PREVIEW_QUALITY;
  private readonly previewWidth = PREVIEW_SIZES.medium;
  private readonly shortSignedUrlExpiry = SHORT_SIGNED_URL_EXPIRY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly utilService: PreviewUtilService,
    private readonly pdfPreviewService: PdfPreviewService,
  ) {}

  /**
   * Generate preview from text file
   */
  async generateTextPreviews(
    documentId: string,
    file: FileInfo & { mimeType: string },
    options?: PreviewGenerationOptions,
  ): Promise<PreviewImage[]> {
    this.logger.log(`Generating text preview for file: ${file.originalName}`);

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'text-preview-'),
    );

    try {
      const inputPath = path.join(tmpDir, 'input.txt');
      const fileStream = await this.r2Service.getFileStream(file.storageUrl);
      await this.utilService.streamToFile(fileStream, inputPath);

      let textContent = await fs.promises.readFile(inputPath, 'utf-8');

      if (textContent.length > 4000) {
        textContent =
          textContent.substring(0, 4000) +
          '\n\n... [Nội dung tiếp theo được rút gọn]';
      }

      const outputPath = path.join(tmpDir, 'preview-1.jpg');
      const converted = await this.convertTextToImage(
        textContent,
        outputPath,
        tmpDir,
      );

      if (!converted) {
        return await this.pdfPreviewService.createPlaceholderPreviews(
          documentId,
          file.originalName,
          {
            processingStart: options?.processingStart,
            sourceType: options?.sourceType ?? 'TEXT',
          },
        );
      }

      const imageBuffer = await fs.promises.readFile(outputPath);
      const { width, height } =
        this.utilService.getImageDimensions(imageBuffer);

      const previewKey = `previews/${documentId}/page-1.jpg`;
      await this.r2Service.uploadBuffer(imageBuffer, previewKey, 'image/jpeg');

      const variantKeys = await this.uploadVariants(
        outputPath,
        previewKey,
        tmpDir,
      );

      const availableSizes: PreviewSize[] = (
        Object.keys(variantKeys) as PreviewSize[]
      ).filter(Boolean);

      const metadata = this.utilService.buildMetadata({
        pageCount: 1,
        processingStart: options?.processingStart,
        sourceType: options?.sourceType ?? 'TEXT',
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
      this.logger.error(
        `Text preview generation failed: ${(error as Error).message}`,
      );
      return await this.pdfPreviewService.createPlaceholderPreviews(
        documentId,
        file.originalName,
        {
          processingStart: options?.processingStart,
          sourceType: options?.sourceType ?? 'TEXT',
        },
      );
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Convert text to image using ImageMagick
   */
  private async convertTextToImage(
    textContent: string,
    outputPath: string,
    tmpDir: string,
  ): Promise<boolean> {
    const escapedText = textContent
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    try {
      await this.utilService.runCommandWithTimeout(
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

      return await this.utilService.fileExists(outputPath);
    } catch (convertError) {
      this.logger.warn(
        `ImageMagick text conversion failed: ${(convertError as Error).message}`,
      );

      // Fallback using caption
      try {
        const wrappedText = this.wrapText(textContent, 80);
        const textFilePath = path.join(tmpDir, 'wrapped.txt');
        await fs.promises.writeFile(textFilePath, wrappedText);

        await this.utilService.runCommandWithTimeout(
          `convert -size ${this.previewWidth}x -background white \
            -fill black -font "NimbusMonoPS-Regular" -pointsize 14 \
            caption:@"${textFilePath}" \
            -bordercolor white -border 20 \
            -quality ${this.previewQuality} "${outputPath}"`,
          { logLabel: 'convert-text-fallback' },
        );

        return await this.utilService.fileExists(outputPath);
      } catch (fallbackError) {
        this.logger.error(
          `Fallback text conversion also failed: ${(fallbackError as Error).message}`,
        );
        return false;
      }
    }
  }

  /**
   * Upload variant sizes
   */
  private async uploadVariants(
    outputPath: string,
    previewKey: string,
    tmpDir: string,
  ): Promise<Partial<Record<PreviewSize, string>>> {
    const variantKeys: Partial<Record<PreviewSize, string>> = {
      medium: previewKey,
    };

    const smallPath = path.join(tmpDir, 'preview-1-small.jpg');
    const largePath = path.join(tmpDir, 'preview-1-large.jpg');

    const smallCreated = await this.utilService.resizeImage(
      outputPath,
      smallPath,
      this.previewSizes.small,
    );

    const largeCreated = await this.utilService.resizeImage(
      outputPath,
      largePath,
      this.previewSizes.large,
    );

    if (smallCreated) {
      const smallBuffer = await fs.promises.readFile(smallPath);
      const smallKey = this.utilService.getVariantKey(previewKey, 'small');
      await this.r2Service.uploadBuffer(smallBuffer, smallKey, 'image/jpeg');
      variantKeys.small = smallKey;
    }

    if (largeCreated) {
      const largeBuffer = await fs.promises.readFile(largePath);
      const largeKey = this.utilService.getVariantKey(previewKey, 'large');
      await this.r2Service.uploadBuffer(largeBuffer, largeKey, 'image/jpeg');
      variantKeys.large = largeKey;
    }

    return variantKeys;
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
}
