/**
 * Image Preview Generator Service
 *
 * Handles image file preview generation:
 * - Resize images to multiple variants
 * - Upload to R2 storage
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudflareR2Service } from '../../common/cloudflare-r2.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FileInfo,
  PREVIEW_SIZES,
  PreviewGenerationOptions,
  PreviewImage,
  PreviewSize,
  SHORT_SIGNED_URL_EXPIRY,
} from '../interfaces';
import { PreviewUtilService } from './preview-util.service';
import { Injectable, Logger } from '@nestjs/common';
import { PreviewStatus } from '@prisma/client';

@Injectable()
export class ImagePreviewService {
  private readonly logger = new Logger(ImagePreviewService.name);
  private readonly previewSizes = PREVIEW_SIZES;
  private readonly shortSignedUrlExpiry = SHORT_SIGNED_URL_EXPIRY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly utilService: PreviewUtilService,
  ) {}

  /**
   * Create preview from image file
   */
  async createImagePreview(
    documentId: string,
    file: FileInfo & { mimeType: string },
    options?: PreviewGenerationOptions,
  ): Promise<PreviewImage> {
    this.logger.log(`Creating image preview for file: ${file.originalName}`);

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'image-preview-'),
    );

    try {
      const inputPath = path.join(tmpDir, 'input');
      const inputStream = await this.r2Service.getFileStream(file.storageUrl);
      await this.utilService.streamToFile(inputStream, inputPath);

      const mediumPath = path.join(tmpDir, 'preview-1.jpg');
      const smallPath = path.join(tmpDir, 'preview-1-small.jpg');
      const largePath = path.join(tmpDir, 'preview-1-large.jpg');

      let mediumReady = await this.utilService.resizeImage(
        inputPath,
        mediumPath,
        this.previewSizes.medium,
      );

      if (!mediumReady && (await this.utilService.fileExists(inputPath))) {
        await fs.promises.copyFile(inputPath, mediumPath);
        mediumReady = true;
      }

      const smallReady = mediumReady
        ? await this.utilService.resizeImage(
            mediumPath,
            smallPath,
            this.previewSizes.small,
          )
        : false;

      const largeReady = await this.utilService.resizeImage(
        inputPath,
        largePath,
        this.previewSizes.large,
      );

      const mediumPathToUse = mediumReady ? mediumPath : inputPath;
      const imageBuffer = await fs.promises.readFile(mediumPathToUse);
      const { width, height } =
        this.utilService.getImageDimensions(imageBuffer);

      const previewKey = `previews/${documentId}/page-1.jpg`;
      await this.r2Service.uploadBuffer(imageBuffer, previewKey, 'image/jpeg');

      const variantKeys: Partial<Record<PreviewSize, string>> = {
        medium: previewKey,
      };

      if (smallReady) {
        const smallBuffer = await fs.promises.readFile(smallPath);
        const smallKey = this.utilService.getVariantKey(previewKey, 'small');
        await this.r2Service.uploadBuffer(smallBuffer, smallKey, 'image/jpeg');
        variantKeys.small = smallKey;
      }

      if (largeReady) {
        const largeBuffer = await fs.promises.readFile(largePath);
        const largeKey = this.utilService.getVariantKey(previewKey, 'large');
        await this.r2Service.uploadBuffer(largeBuffer, largeKey, 'image/jpeg');
        variantKeys.large = largeKey;
      }

      const availableSizes: PreviewSize[] = (
        Object.keys(variantKeys) as PreviewSize[]
      ).filter(Boolean);

      const metadata = this.utilService.buildMetadata({
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
}
