import * as crypto from 'crypto';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

export interface FileUploadResult {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  // storageUrl: string; // Removed for security - use secure endpoint
  fileHash: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
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
          `Processing file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`,
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
      throw new InternalServerErrorException('Không thể tải lên tệp');
    }
  }

  /**
   * Upload single file to storage and save metadata
   */
  async uploadFile(file: Express.Multer.File, userId: string) {
    try {
      this.logger.log(
        `Uploading file: ${file.originalname} for user: ${userId}`,
      );

      // Validate file
      this.validateFile(file);

      // Generate file hash first to check for duplicates
      const fileHash = crypto
        .createHash('sha256')
        .update(file.buffer)
        .digest('hex');
      this.logger.log(`Generated file hash: ${fileHash}`);

      // Check if file with same hash already exists
      const existingFile = await this.prisma.file.findUnique({
        where: { fileHash },
      });

      if (existingFile) {
        this.logger.log(
          `File with hash ${fileHash} already exists, returning existing record`,
        );
        return {
          success: true,
          data: {
            id: existingFile.id,
            originalName: existingFile.originalName,
            fileName: existingFile.fileName,
            fileSize: Number(existingFile.fileSize),
            mimeType: existingFile.mimeType,
            fileHash: existingFile.fileHash,
            // Don't return direct storage URL for security
            createdAt: existingFile.createdAt,
          },
        };
      }

      // Upload to R2 only if not duplicate
      this.logger.log(`Uploading to R2 storage...`);
      const uploadResult = await this.r2Service.uploadFile(file, userId);
      this.logger.log(`R2 upload completed:`, uploadResult);

      // Save file metadata to database
      this.logger.log(`Saving file metadata to database...`);
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
          // Don't return direct storage URL for security
          createdAt: fileRecord.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);

      // Re-throw the original error if it's already a known exception
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
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
        throw new NotFoundException('Không tìm thấy tệp');
      }

      return await this.r2Service.getSignedDownloadUrl(file.storageUrl);
    } catch (error) {
      this.logger.error('Error getting download URL:', error);
      throw new InternalServerErrorException('Không thể lấy URL tải xuống');
    }
  }

  /**
   * Get secure preview/access URL for a file (with expiration)
   */
  async getSecureFileUrl(
    fileId: string,
    userId?: string,
    options: { allowSharedAccess?: boolean } = {},
  ): Promise<string> {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: {
          uploader: true,
        },
      });

      if (!file) {
        throw new NotFoundException('Không tìm thấy tệp');
      }

      // Check if user has access to the file
      const allowSharedAccess = options.allowSharedAccess ?? false;
      if (!file.isPublic && !allowSharedAccess && file.uploaderId !== userId) {
        throw new BadRequestException('Bạn không có quyền truy cập tệp này');
      }

      // Generate signed URL with 1 hour expiration
      return await this.r2Service.getSignedDownloadUrl(file.storageUrl, 3600); // 1 hour
    } catch (error) {
      this.logger.error('Error getting secure file URL:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể lấy URL tệp bảo mật');
    }
  }

  /**
   * Add secure URLs to file objects for API responses
   */
  async addSecureUrlsToFiles(
    files: any[],
    options: { userId?: string; allowSharedAccess?: boolean } = {},
  ): Promise<any[]> {
    try {
      const { userId, allowSharedAccess } = options;
      const filesWithUrls = await Promise.all(
        files.map(async file => {
          try {
            const secureUrl = await this.getSecureFileUrl(file.id, userId, {
              allowSharedAccess,
            });
            return {
              ...file,
              secureUrl,
              expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
            };
          } catch (error) {
            // If can't get secure URL, return file without it
            this.logger.warn(
              `Could not get secure URL for file ${file.id}:`,
              error.message,
            );
            return file;
          }
        }),
      );
      return filesWithUrls;
    } catch (error) {
      this.logger.error('Error adding secure URLs to files:', error);
      return files; // Return original files if something goes wrong
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
      throw new NotFoundException('Không tìm thấy tệp');
    }

    return file;
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File) {
    this.logger.log(
      `Validating file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size}`,
    );

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check file type
    const allowedTypes = [
      // PDF files
      'application/pdf',

      // Microsoft Office documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt

      // Text files
      'text/plain', // .txt
      'text/markdown', // .md
      'text/csv', // .csv
      'application/rtf', // .rtf

      // Image files
      'image/jpeg', // .jpg, .jpeg
      'image/png', // .png
      'image/gif', // .gif
      'image/bmp', // .bmp
      'image/webp', // .webp
      'image/svg+xml', // .svg

      // Archive files
      'application/zip', // .zip
      'application/x-rar-compressed', // .rar
      'application/x-7z-compressed', // .7z

      // Other common formats
      'application/json', // .json
      'application/xml', // .xml
      'text/xml', // .xml
      'text/html', // .html
      'text/css', // .css
      'application/javascript', // .js
      'text/javascript', // .js
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      this.logger.error(
        `File type not supported: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`,
      );
      throw new BadRequestException(
        `File type not supported: ${file.mimetype}. Please upload a supported file format.`,
      );
    }

    this.logger.log(`File validation passed for: ${file.originalname}`);
  }

  /**
   * Get allowed file types
   */
  getAllowedTypes(): { types: string[]; description: string } {
    const allowedTypes = [
      // PDF files
      'application/pdf',

      // Microsoft Office documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt

      // Text files
      'text/plain', // .txt
      'text/markdown', // .md
      'text/csv', // .csv
      'application/rtf', // .rtf

      // Image files
      'image/jpeg', // .jpg, .jpeg
      'image/png', // .png
      'image/gif', // .gif
      'image/bmp', // .bmp
      'image/webp', // .webp
      'image/svg+xml', // .svg

      // Archive files
      'application/zip', // .zip
      'application/x-rar-compressed', // .rar
      'application/x-7z-compressed', // .7z

      // Other common formats
      'application/json', // .json
      'application/xml', // .xml
      'text/xml', // .xml
      'text/html', // .html
      'text/css', // .css
      'application/javascript', // .js
      'text/javascript', // .js
    ];

    return {
      types: allowedTypes,
      description: 'Supported file types for upload',
    };
  }

  /**
   * Increment view count for a file
   */
  async incrementViewCount(
    fileId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      this.logger.log(
        `Incrementing view count for file ${fileId} by user ${userId || 'anonymous'}`,
      );

      // Check if file exists
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: {
          uploader: true,
          documentFiles: {
            include: {
              document: true,
            },
          },
        },
      });

      if (!file) {
        throw new NotFoundException('Không tìm thấy tệp');
      }

      // Check if user has access to the file
      if (!file.isPublic && file.uploaderId !== userId) {
        throw new BadRequestException('Bạn không có quyền truy cập tệp này');
      }

      // Find the document that contains this file
      const documentFile = file.documentFiles[0];
      if (!documentFile) {
        throw new BadRequestException(
          'Tệp không được liên kết với tài liệu nào',
        );
      }

      // Create view record for the document (since View model tracks document views)
      await this.prisma.view.create({
        data: {
          documentId: documentFile.document.id,
          userId: userId || null,
          ipAddress,
          userAgent,
        },
      });

      // Increment view count on document
      await this.prisma.document.update({
        where: { id: documentFile.document.id },
        data: { viewCount: { increment: 1 } },
      });

      this.logger.log(
        `View count incremented successfully for file ${fileId} via document ${documentFile.document.id}`,
      );
      return { success: true, message: 'View count incremented successfully' };
    } catch (error) {
      this.logger.error(
        `Error incrementing view count for file ${fileId}:`,
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể tăng số lượt xem');
    }
  }

  /**
   * Generate unique key for file storage
   */
  private generateUniqueKey(prefix: string, originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);

    return `${prefix}${timestamp}_${random}_${sanitizedName}`;
  }
}
