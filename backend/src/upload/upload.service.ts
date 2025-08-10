import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { CloudflareR2Service } from './cloudflare-r2.service'
import { UploadFileDto } from './dto/upload-file.dto'

export interface FileResult {
  file: any;
  document?: any;
  error?: string;
  originalName?: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly maxFilesPerUpload = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service
  ) {}

  /**
   * Upload single file
   */
  async uploadSingleFile(
    file: Express.Multer.File,
    uploadData: UploadFileDto,
    userId: string
  ): Promise<FileResult> {
    try {
      // Validate file
      this.validateFile(file);

      this.logger.log(`Starting upload for file: ${file.originalname} (${file.size} bytes)`);

      // Check for duplicates by hash
      const fileHash = this.r2Service.generateFileHash(file.buffer);
      const existingFile = await this.prisma.file.findUnique({
        where: { fileHash },
      });

      if (existingFile) {
        this.logger.warn(`Duplicate file detected: ${file.originalname}`);
        // Return existing file instead of uploading again
        return { file: existingFile };
      }

      // Upload to R2
      const keyPrefix = `uploads/${userId}/`;
      const uniqueKey = this.generateUniqueKey(keyPrefix, file.originalname);

      this.logger.log(`Uploading to R2 with key: ${uniqueKey}`);

      const uploadResult = await this.r2Service.uploadFile(file, uniqueKey, {
        uploaderId: userId,
        originalName: file.originalname,
      });

      this.logger.log(`File uploaded to R2 successfully: ${uploadResult.url}`);

      // Create file record in database
      this.logger.log(`Creating database record for file: ${file.originalname}`);

      // Store file size as BigInt but add string size for easier serialization
      const fileSizeString = file.size.toString();

      const fileRecord = await this.prisma.file.create({
        data: {
          originalName: file.originalname,
          fileName: uniqueKey,
          mimeType: file.mimetype,
          fileSize: BigInt(file.size),
          fileHash,
          storageUrl: uploadResult.url,
          uploaderId: userId,
          isPublic: Boolean(uploadData.isPublic),
          metadata: {
            uploadedAt: new Date().toISOString(),
            userAgent: 'web-upload',
            fileSizeString: fileSizeString, // Store as string for serialization
          },
        },
      });

      // Convert BigInt to string before logging
      this.logger.log(`Database record created for file: ${fileRecord.id}`);

      // Create document record if document data is provided
      let documentRecord;
      if (uploadData.title || uploadData.description || uploadData.categoryId) {
        this.logger.log(`Creating document record for file: ${file.originalname}`);

        const defaultCategory = await this.getOrCreateDefaultCategory();

        documentRecord = await this.prisma.document.create({
          data: {
            title: uploadData.title || file.originalname,
            description: uploadData.description,
            fileName: file.originalname,
            fileSize: BigInt(file.size), // Keep BigInt for database
            mimeType: file.mimetype,
            filePath: uploadResult.url,
            uploaderId: userId,
            categoryId: uploadData.categoryId || defaultCategory.id,
            fileId: fileRecord.id,
            isPublic: Boolean(uploadData.isPublic),
            tags: uploadData.tags || [],
            language: uploadData.language || 'en',
            fileHash,
          },
        });

        this.logger.log(`Document record created: ${documentRecord.id}`);
      }

      this.logger.log(`File uploaded successfully: ${file.originalname} by user ${userId}`);
      return { file: fileRecord, document: documentRecord };
    } catch (error) {
      this.logger.error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      if (error instanceof Error) {
        this.logger.error(`Error stack: ${error.stack || 'No stack trace available'}`);
      }

      // Check if the file was uploaded to R2 but database creation failed
      if (error.message && error.message.includes('prisma')) {
        this.logger.error('Database error occurred after file was uploaded to R2');

        // Try to handle specific Prisma errors
        if (error.code) {
          this.logger.error(`Prisma error code: ${error.code}`);
        }
      }

      // Re-throw with more specific message
      throw new BadRequestException(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    uploadData: UploadFileDto,
    userId: string
  ): Promise<FileResult[]> {
    if (files.length > this.maxFilesPerUpload) {
      throw new BadRequestException(
        `Cannot upload more than ${this.maxFilesPerUpload} files at once`
      );
    }

    const results: FileResult[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadSingleFile(file, uploadData, userId);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to upload file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        results.push({
          file: null,
          document: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          originalName: file.originalname,
        });
      }
    }

    return results;
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string, userId?: string): Promise<any> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user has access to the file
    if (!file.isPublic && file.uploaderId !== userId) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Get user's uploaded files
   */
  async getUserFiles(
    userId: string,
    page: number = 1,
    limit: number = 20,
    mimeType?: string
  ): Promise<{ files: any[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    const where = {
      uploaderId: userId,
      ...(mimeType && { mimeType: { contains: mimeType } }),
    };

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          documents: {
            select: {
              id: true,
              title: true,
              isPublic: true,
              downloadCount: true,
              viewCount: true,
            },
          },
        },
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      files,
      total,
      page,
      limit,
    };
  }

  /**
   * Get public files
   */
  async getPublicFiles(
    page: number = 1,
    limit: number = 20,
    mimeType?: string
  ): Promise<{ files: any[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    const where = {
      isPublic: true,
      ...(mimeType && { mimeType: { contains: mimeType } }),
    };

    const [files, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      files,
      total,
      page,
      limit,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.uploaderId !== userId) {
      throw new BadRequestException('You can only delete your own files');
    }

    try {
      // Delete from R2
      await this.r2Service.deleteFile(file.fileName);

      // Delete from database
      await this.prisma.file.delete({
        where: { id: fileId },
      });

      this.logger.log(`File deleted successfully: ${fileId} by user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      throw new BadRequestException(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get download URL for file
   */
  async getDownloadUrl(fileId: string, userId?: string): Promise<string> {
    const file = await this.getFile(fileId, userId);

    if (file.isPublic) {
      return file.storageUrl;
    } else {
      // Generate signed URL for private files
      return await this.r2Service.getSignedDownloadUrl(file.fileName, 3600); // 1 hour
    }
  }

  /**
   * Increment view count for a document
   */
  async incrementViewCount(fileId: string): Promise<void> {
    try {
      // We find the document associated with the fileId first
      const document = await this.prisma.document.findFirst({
        where: { fileId: fileId },
      });

      if (document) {
        await this.prisma.document.update({
          where: { id: document.id },
          data: { viewCount: { increment: 1 } },
        });
        this.logger.log(`Incremented view count for document: ${document.id}`);
      } else {
        this.logger.warn(
          `Could not find document associated with fileId: ${fileId} to increment view count.`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to increment view count for file ${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : ''
      );
      // Do not re-throw, as this is not a critical failure
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`
      );
    }

    const allowedTypes = this.r2Service.getAllowedDocumentTypes();
    if (!this.r2Service.isValidFileType(file.mimetype, allowedTypes)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
  }

  /**
   * Generate unique key for file storage
   */
  private generateUniqueKey(prefix: string, originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);

    return `${prefix}${timestamp}_${random}_${sanitizedName}`;
  }

  /**
   * Get or create default category
   */
  private async getOrCreateDefaultCategory() {
    let defaultCategory = await this.prisma.category.findFirst({
      where: { name: 'General' },
    });

    if (!defaultCategory) {
      defaultCategory = await this.prisma.category.create({
        data: {
          name: 'General',
          description: 'General documents category',
          icon: 'folder',
          color: '#6B7280',
        },
      });
    }

    return defaultCategory;
  }
}
