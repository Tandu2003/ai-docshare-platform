import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    try {
      const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
      const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      this.bucketName = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') || 'docshare';

      this.logger.log(
        `R2 Config: endpoint=${endpoint}, accessKeyId=${accessKeyId?.substring(0, 8)}..., bucket=${this.bucketName}`
      );

      if (!endpoint || !accessKeyId || !secretAccessKey) {
        this.logger.error('Missing R2 credentials:', {
          endpoint: !!endpoint,
          accessKeyId: !!accessKeyId,
          secretAccessKey: !!secretAccessKey,
        });
        throw new Error('Cloudflare R2 credentials not configured');
      }

      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.logger.log('CloudflareR2Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CloudflareR2Service:', error);
      throw error;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<{
    fileName: string;
    storageUrl: string;
    fileSize: number;
    mimeType: string;
    fileHash: string;
  }> {
    try {
      this.logger.log(`Starting upload for file: ${file.originalname}, size: ${file.size}`);

      // Validate inputs
      if (!file || !file.buffer) {
        throw new Error('Invalid file: missing buffer');
      }

      if (!userId) {
        throw new Error('Invalid userId');
      }

      // Generate file hash
      const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      this.logger.log(`Generated file hash: ${fileHash}`);

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `uploads/${userId}/${fileName}`;
      this.logger.log(`Generated key: ${key}`);

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          fileHash,
        },
      });

      this.logger.log(`Sending upload command to R2 bucket: ${this.bucketName}...`);
      const result = await this.s3Client.send(command);
      this.logger.log(`Upload to R2 completed successfully:`, result);

      const publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');
      const storageUrl = publicUrl
        ? `${publicUrl}/${key}`
        : `${this.configService.get('CLOUDFLARE_R2_ENDPOINT')}/${this.bucketName}/${key}`;

      this.logger.log(`File uploaded successfully: ${fileName}, URL: ${storageUrl}`);

      return {
        fileName,
        storageUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash,
      };
    } catch (error) {
      this.logger.error('Error uploading file to R2:', error);
      this.logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.Code || error.code,
      });
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async getSignedDownloadUrl(storageUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      // Extract key from storage URL
      const key = this.extractKeyFromUrl(storageUrl);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      this.logger.error('Error generating signed URL:', error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  async deleteFile(storageUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(storageUrl);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error('Error deleting file from R2:', error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  private extractKeyFromUrl(storageUrl: string): string {
    try {
      // If storageUrl is already a key, return it
      if (!storageUrl.startsWith('http')) {
        return storageUrl;
      }

      // Extract key from full URL
      const url = new URL(storageUrl);
      return url.pathname.substring(1); // Remove leading slash
    } catch (error) {
      this.logger.error('Error extracting key from URL:', error);
      throw new BadRequestException('Invalid storage URL format');
    }
  }
}
