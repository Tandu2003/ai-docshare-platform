import * as crypto from 'crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaService } from '../prisma/prisma.service';

export interface FileUploadResult {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  storageUrl: string;
  fileHash: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service
  ) {}

  /**
   * Upload multiple files to storage and save metadata
   */
  async uploadFiles(files: Express.Multer.File[], userId: string) {
    try {
      this.logger.log(`Uploading ${files.length} files for user: ${userId}`);

      const results: any[] = [];

      for (const file of files) {
        this.logger.log(
          `Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`
        );
        const result = await this.uploadFile(file, userId);
        results.push(result.data);
      }

      return {
        success: true,
        data: results,
        message: `Successfully uploaded ${results.length} files`,
      };
    } catch (error) {
      this.logger.error('Error uploading files:', error);
      this.logger.error('Error stack:', error.stack);
      throw new InternalServerErrorException('Failed to upload files');
    }
  }

  /**
   * Upload single file to storage and save metadata
   */
  async uploadFile(file: Express.Multer.File, userId: string) {
    try {
      this.logger.log(`Uploading file: ${file.originalname} for user: ${userId}`);

      // Validate file
      this.validateFile(file);

      // Generate file hash first to check for duplicates
      const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Check if file with same hash already exists
      const existingFile = await this.prisma.file.findUnique({
        where: { fileHash },
      });

      if (existingFile) {
        this.logger.log(`File with hash ${fileHash} already exists, returning existing record`);
        return {
          success: true,
          data: {
            id: existingFile.id,
            originalName: existingFile.originalName,
            fileName: existingFile.fileName,
            fileSize: Number(existingFile.fileSize),
            mimeType: existingFile.mimeType,
            fileHash: existingFile.fileHash,
            storageUrl: existingFile.storageUrl,
            createdAt: existingFile.createdAt,
          },
        };
      }

      // Upload to R2 only if not duplicate
      const uploadResult = await this.r2Service.uploadFile(file, userId);

      // Save file metadata to database
      const fileRecord = await this.prisma.file.create({
        data: {
          originalName: file.originalname,
          fileName: uploadResult.fileName,
          fileSize: BigInt(uploadResult.fileSize),
          mimeType: uploadResult.mimeType,
          fileHash: uploadResult.fileHash,
          storageUrl: uploadResult.storageUrl,
          uploaderId: userId,
          isPublic: false,
          metadata: {},
        },
      });

      this.logger.log(`File uploaded successfully: ${fileRecord.id}`);

      return {
        success: true,
        data: {
          id: fileRecord.id,
          originalName: fileRecord.originalName,
          fileName: fileRecord.fileName,
          fileSize: Number(fileRecord.fileSize),
          mimeType: fileRecord.mimeType,
          fileHash: fileRecord.fileHash,
          storageUrl: fileRecord.storageUrl,
          createdAt: fileRecord.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      return await this.r2Service.getSignedDownloadUrl(file.storageUrl);
    } catch (error) {
      this.logger.error('Error getting download URL:', error);
      throw new InternalServerErrorException('Failed to get download URL');
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<any> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File) {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`
      );
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not supported');
    }
  }

  /**
   * Generate unique key for file storage
   */
  private generateUniqueKey(prefix: string, originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);

    return `${prefix}${timestamp}_${random}_${sanitizedName}`;
  }
}
