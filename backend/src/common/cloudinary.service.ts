import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';

export type CloudinaryResourceType = 'image' | 'raw' | 'video' | 'auto';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        'Missing Cloudinary credentials. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
      throw new Error('Cloudinary credentials are not configured');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.logger.log(
      `Cloudinary initialized for cloud "${cloudName}" with key ${apiKey.substring(0, 4)}****`,
    );
  }

  async uploadFromSource(
    source: string,
    options: UploadApiOptions = {},
  ): Promise<UploadApiResponse> {
    this.logger.log(
      `Uploading to Cloudinary from source: ${this.maskSource(source)} with options ${JSON.stringify(
        {
          resource_type: options.resource_type || 'auto',
          public_id: options.public_id,
          folder: options.folder,
        },
      )}`,
    );

    return cloudinary.uploader.upload(source, {
      resource_type: 'auto',
      ...options,
    });
  }

  async uploadImageBuffer(
    buffer: Buffer,
    options: UploadApiOptions = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          ...options,
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary buffer upload failed: ${error.message}`,
            );
            reject(
              new Error(
                error.message || 'Cloudinary buffer upload failed unexpectedly',
              ),
            );
            return;
          }
          resolve(result as UploadApiResponse);
        },
      );

      const readable = new Readable();
      readable._read = () => {}; // No-op
      readable.push(buffer);
      readable.push(null);
      readable.pipe(upload);
    });
  }

  generatePreviewUrl(
    publicId: string,
    pageNumber: number,
    options: {
      resourceType?: CloudinaryResourceType;
      width?: number;
      quality?: string | number;
      expiresIn?: number;
      format?: string;
      version?: number;
    } = {},
  ): string {
    const expiresAt = options.expiresIn
      ? Math.round(Date.now() / 1000) + options.expiresIn
      : undefined;

    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      expires_at: expiresAt,
      resource_type: options.resourceType || 'image',
      format: options.format || 'jpg',
      page: pageNumber,
      version: options.version,
      transformation: [
        {
          width: options.width,
          crop: 'limit',
          quality: options.quality || 'auto:good',
        },
      ],
    });
  }

  async deleteAsset(
    publicId: string,
    resourceType: CloudinaryResourceType = 'auto',
  ): Promise<void> {
    this.logger.log(
      `Deleting Cloudinary asset ${publicId} (type=${resourceType})`,
    );
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'auto' ? undefined : resourceType,
      invalidate: true,
    });
  }

  private maskSource(source: string): string {
    if (source.startsWith('http')) {
      return source.replace(/(https?:\/\/)([^/]+)\//, '$1***hidden***/');
    }
    if (source.length > 40) {
      return `${source.substring(0, 10)}...${source.substring(source.length - 6)}`;
    }
    return source;
  }
}
