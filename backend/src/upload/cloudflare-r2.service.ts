import { createHash } from 'crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || '';
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') || '';

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName || !this.publicUrl) {
      throw new Error('Missing required Cloudflare R2 configuration');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Test connection on initialization
    void this.testConnection();
  }

  /**
   * Test R2 connection
   */
  private async testConnection(): Promise<void> {
    try {
      this.logger.log('Testing Cloudflare R2 connection...');
      this.logger.log(`Bucket: ${this.bucketName}`);
      this.logger.log(`Endpoint: ${this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT')}`);

      // Try to list bucket to test credentials
      const { HeadBucketCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');

      // Test bucket access
      const headCommand = new HeadBucketCommand({
        Bucket: this.bucketName,
      });

      await this.s3Client.send(headCommand);
      this.logger.log('Bucket access test successful');

      // Test list permissions
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1,
      });

      await this.s3Client.send(listCommand);
      this.logger.log('Cloudflare R2 connection and permissions successful');
    } catch (error) {
      this.logger.error(
        `Cloudflare R2 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error('Error details:', error);

      if (typeof error === 'object' && error !== null) {
        if ('Code' in error) {
          this.logger.error('Error code:', error.Code || 'Unknown');
        }
        if ('name' in error) {
          this.logger.error('Error name:', error.name || 'Unknown');
        }
      }

      this.logger.error('Please check your R2 credentials and bucket configuration');
    }
  }

  /**
   * Upload a file to Cloudflare R2
   */
  async uploadFile(
    file: Express.Multer.File,
    key: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; key: string }> {
    try {
      this.logger.log(`Attempting to upload file: ${key} to bucket: ${this.bucketName}`);
      this.logger.debug(`File size: ${file.size}, mimetype: ${file.mimetype}`);

      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty');
      }

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        Metadata: metadata,
      });

      await this.s3Client.send(command);
      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`File uploaded successfully: ${key}`);
      return { url, key };
    } catch (error) {
      this.logger.error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error(`Error details:`, error);

      if (error.code) {
        this.logger.error(`AWS S3 Error Code: ${error.code}`);
      }

      if (error.$metadata) {
        this.logger.error(`AWS S3 Metadata:`, error.$metadata);
      }

      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
    }
  }

  /**
   * Upload multiple files to Cloudflare R2
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    keyPrefix: string = '',
    metadata?: Record<string, string>
  ): Promise<Array<{ url: string; key: string; originalName: string; size: number }>> {
    const uploadPromises = files.map(async (file, index) => {
      const extension = this.getFileExtension(file.originalname);
      const uniqueKey = this.generateUniqueKey(keyPrefix, file.originalname, extension);

      const result = await this.uploadFile(file, uniqueKey, {
        ...metadata,
        originalName: file.originalname,
        uploadIndex: index.toString(),
      });

      return {
        ...result,
        originalName: file.originalname,
        size: file.size,
      };
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Get a signed URL for downloading a private file
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error('Error details:', error);

      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
    }
  }

  /**
   * Delete a file from Cloudflare R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.logger.error('Error details:', error);

      if (typeof error === 'object' && error !== null) {
        if ('code' in error) {
          this.logger.error(`AWS S3 Error Code: ${error.code}`);
        }

        if ('$metadata' in error) {
          this.logger.error('AWS S3 Metadata:', error.$metadata);
        }
      }

      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
    }
  }

  /**
   * Check if a file exists in Cloudflare R2
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'NotFound'
      ) {
        return false;
      }

      this.logger.error(
        `Error checking if file exists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Generate a unique key for file storage
   */
  private generateUniqueKey(prefix: string, originalName: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);

    return `${prefix}${timestamp}_${random}_${sanitizedName}${extension}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  /**
   * Generate SHA-256 hash for file content
   */
  generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Validate file type
   */
  isValidFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimetype);
  }

  /**
   * Get allowed document MIME types
   */
  getAllowedDocumentTypes(): string[] {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
    ];
  }
}
