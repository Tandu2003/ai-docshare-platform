import * as crypto from 'crypto';
import { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly s3Client: S3Client;
  public readonly bucketName: string;
  constructor(private configService: ConfigService) {
    try {
      const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
      const accessKeyId = this.configService.get<string>(
        'CLOUDFLARE_R2_ACCESS_KEY_ID',
      );
      const secretAccessKey = this.configService.get<string>(
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      );
      this.bucketName =
        this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME') ||
        'docshare';

      this.logger.log(
        `R2 Config: endpoint=${endpoint}, accessKeyId=${accessKeyId?.substring(0, 8)}..., bucket=${this.bucketName}`,
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
      throw new Error('Unexpected error');
    }
  }

  async uploadFile(
    file: {
      originalname: string;
      buffer: Buffer;
      size: number;
      mimetype: string;
    },
    userId: string,
    folder: string = 'uploads',
  ): Promise<{
    fileName: string;
    storageUrl: string;
    fileSize: number;
    mimeType: string;
    fileHash: string;
  }> {
    try {
      // Validate inputs
      if (!file || !file.buffer) {
        throw new Error('Invalid file: missing buffer');
      }

      if (!userId) {
        throw new Error('Invalid userId');
      }

      // Generate file hash
      const fileHash = crypto
        .createHash('sha256')
        .update(file.buffer)
        .digest('hex');

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${folder}/${userId}/${fileName}`;

      // Upload to R2
      // Encode metadata values to handle non-ASCII characters (Vietnamese, etc.)
      const encodedOriginalName = Buffer.from(file.originalname).toString(
        'base64',
      );

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalname: encodedOriginalName, // Base64 encoded to handle special characters
          uploadedby: userId,
          filehash: fileHash,
        },
      });

      await this.s3Client.send(command);

      const publicUrl = this.configService.get<string>(
        'CLOUDFLARE_R2_PUBLIC_URL',
      );
      const storageUrl = publicUrl
        ? `${publicUrl}/${key}`
        : `${this.configService.get('CLOUDFLARE_R2_ENDPOINT')}/${this.bucketName}/${key}`;

      return {
        fileName,
        storageUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async getSignedDownloadUrl(
    storageUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      // Extract key from storage URL
      const key = this.extractKeyFromUrl(storageUrl);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch {
      throw new BadRequestException('Không thể tạo URL tải xuống');
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
    } catch {
      throw new BadRequestException('Không thể xóa tệp');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const storageUrl = `https://${this.bucketName}.${this.configService.get('CLOUDFLARE_R2_ENDPOINT')}/${key}`;

      return storageUrl;
    } catch {
      throw new BadRequestException('Không thể tải lên bộ đệm lên lưu trữ');
    }
  }

  async getFileStream(storageUrl: string): Promise<Readable> {
    try {
      const key = this.extractKeyFromUrl(storageUrl);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No file body received');
      }

      return response.Body as Readable;
    } catch {
      throw new BadRequestException('Không thể lấy luồng tệp');
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

      return url.pathname.substring(1);
    } catch {
      throw new BadRequestException('Định dạng URL lưu trữ không hợp lệ');
    }
  }
}
