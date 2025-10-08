import * as archiver from 'archiver';
import { randomBytes } from 'crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentShareLink } from '@prisma/client';

import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ShareDocumentDto } from './dto/share-document.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private r2Service: CloudflareR2Service,
    private configService: ConfigService
  ) {}

  /**
   * Create a document from uploaded files
   */
  async createDocument(createDocumentDto: CreateDocumentDto, userId: string) {
    try {
      const {
        title,
        description,
        fileIds,
        categoryId,
        isPublic = false,
        tags = [],
        language = 'en',
        useAI = false,
        aiAnalysis,
      } = createDocumentDto;

      this.logger.log(`Creating document for user ${userId} with files: ${fileIds.join(', ')}`);

      // Validate that all files exist and belong to the user
      const files = await this.prisma.file.findMany({
        where: { id: { in: fileIds }, uploaderId: userId },
      });

      if (files.length !== fileIds.length) {
        this.logger.error(
          `Files validation failed. Found ${files.length} files, expected ${fileIds.length}`
        );

        throw new BadRequestException('Some files not found or do not belong to the user');
      }

      this.logger.log(
        `Files validated successfully: ${files.map((f) => f.originalName).join(', ')}`
      );

      // Get or create default category
      const category = categoryId
        ? await this.prisma.category.findUnique({ where: { id: categoryId } })
        : await this.getOrCreateDefaultCategory();

      if (!category) {
        this.logger.error(`Category not found: ${categoryId}`);
        throw new BadRequestException('Category not found');
      }

      this.logger.log(`Using category: ${category.name} (${category.id})`);

      // Create one document with multiple files
      const document = await this.prisma.document.create({
        data: {
          title,
          description,
          uploaderId: userId,
          categoryId: category.id,
          isPublic,
          tags,
          language,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          category: true,
        },
      });

      this.logger.log(`Document created successfully: ${document.id}`);

      // Create DocumentFile relationships
      const documentFiles = await Promise.all(
        files.map((file, index) =>
          this.prisma.documentFile.create({
            data: {
              documentId: document.id,
              fileId: file.id,
              order: index,
            },
            include: {
              file: true,
            },
          })
        )
      );

      this.logger.log(`Document-file relationships created: ${documentFiles.length} files`);

      // Save AI analysis if provided
      if (useAI && aiAnalysis && aiAnalysis.confidence && aiAnalysis.confidence > 0) {
        try {
          await this.prisma.aIAnalysis.create({
            data: {
              documentId: document.id,
              summary: aiAnalysis.summary,
              keyPoints: aiAnalysis.keyPoints || [],
              suggestedTags: aiAnalysis.tags || [],
              difficulty: aiAnalysis.difficulty || 'beginner',
              language: aiAnalysis.language || 'en',
              confidence: aiAnalysis.confidence,
            },
          });
          this.logger.log(`AI analysis saved for document ${document.id}`);
        } catch (error) {
          this.logger.warn(`Failed to save AI analysis: ${error.message}`);
        }
      }

      // Update files to mark them as public if document is public
      if (isPublic) {
        await this.prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: { isPublic: true },
        });
      }

      // Return document with files
      const result = {
        ...document,
        files: documentFiles.map((df) => df.file),
      };

      this.logger.log(`Document creation completed successfully: ${document.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating document:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while creating document');
    }
  }

  /**
   * Prepare document download with all its files
   */
  async prepareDocumentDownload(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          include: {
            file: true,
          },
          orderBy: { order: 'asc' },
        },
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
      },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    // Increment download count
    await this.prisma.document.update({
      where: { id: documentId },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        uploader: document.uploader,
        category: document.category,
        createdAt: document.createdAt,
      },
      files: document.files.map((df) => ({
        id: df.file.id,
        originalName: df.file.originalName,
        fileName: df.file.fileName,
        mimeType: df.file.mimeType,
        fileSize: df.file.fileSize,
        // storageUrl: df.file.storageUrl, // Removed for security - use secure endpoint
        order: df.order,
      })),
    };
  }

  /**
   * Get or create default category
   */
  private async getOrCreateDefaultCategory() {
    let category = await this.prisma.category.findFirst({
      where: { name: 'General' },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          name: 'General',
          description: 'Default category for documents',
          isActive: true,
          documentCount: 0,
          sortOrder: 0,
        },
      });
    }

    return category;
  }

  /**
   * Get user's documents with pagination
   */
  async getUserDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      this.logger.log(`Getting documents for user ${userId}, page ${page}, limit ${limit}`);

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: { uploaderId: userId },
          include: {
            files: {
              include: {
                file: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            category: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.document.count({
          where: { uploaderId: userId },
        }),
      ]);

      // Transform the data and add secure URLs
      const transformedDocuments = await Promise.all(
        documents.map(async (document) => {
          const filesData = document.files.map((df) => ({
            id: df.file.id,
            originalName: df.file.originalName,
            fileName: df.file.fileName,
            mimeType: df.file.mimeType,
            fileSize: df.file.fileSize,
            order: df.order,
          }));

          const filesWithSecureUrls = await this.filesService.addSecureUrlsToFiles(filesData, {
            userId,
          });

          return {
            id: document.id,
            title: document.title,
            description: document.description,
            isPublic: document.isPublic,
            isApproved: document.isApproved,
            isPremium: document.isPremium,
            isDraft: document.isDraft,
            tags: document.tags,
            language: document.language,
            createdAt: document.createdAt?.toISOString(),
            updatedAt: document.updatedAt?.toISOString(),
            uploaderId: document.uploaderId,
            categoryId: document.categoryId,
            category: document.category,
            downloadCount: document.downloadCount,
            viewCount: document.viewCount,
            averageRating: document.averageRating,
            totalRatings: document.totalRatings,
            files: filesWithSecureUrls,
          };
        })
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error getting user documents:', error);
      throw new InternalServerErrorException('Failed to get user documents');
    }
  }

  /**
   * Get public documents with pagination
   */
  async getPublicDocuments(page: number = 1, limit: number = 10, userId?: string) {
    try {
      const skip = (page - 1) * limit;

      this.logger.log(`Getting public documents, page ${page}, limit ${limit}`);

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: {
            isPublic: true,
          },
          include: {
            files: {
              include: {
                file: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            category: true,
            uploader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.document.count({
          where: {
            isPublic: true,
          },
        }),
      ]);

      // Transform the data and add secure URLs
      const transformedDocuments = await Promise.all(
        documents.map(async (document) => {
          const filesData = document.files.map((df) => ({
            id: df.file.id,
            originalName: df.file.originalName,
            fileName: df.file.fileName,
            mimeType: df.file.mimeType,
            fileSize: df.file.fileSize,
            order: df.order,
          }));

          const filesWithSecureUrls = await this.filesService.addSecureUrlsToFiles(filesData, {
            userId,
          });

          return {
            id: document.id,
            title: document.title,
            description: document.description,
            isPublic: document.isPublic,
            tags: document.tags,
            language: document.language,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            uploaderId: document.uploaderId,
            categoryId: document.categoryId,
            category: document.category,
            uploader: document.uploader,
            downloadCount: document.downloadCount,
            viewCount: document.viewCount,
            averageRating: document.averageRating,
            files: filesWithSecureUrls,
          };
        })
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error getting public documents:', error);
      throw new InternalServerErrorException('Failed to get public documents');
    }
  }

  /**
   * Track document view
   */
  async viewDocument(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string
  ) {
    try {
      this.logger.log(`Tracking view for document ${documentId} by user ${userId || 'anonymous'}`);

      // Check if document exists and is public (or user has access)
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          isPublic: true,
          uploaderId: true,
          viewCount: true,
        },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      // Check access permissions
      if (!document.isPublic && document.uploaderId !== userId) {
        throw new BadRequestException('Document is not public');
      }

      // Create view record
      await this.prisma.view.create({
        data: {
          documentId,
          userId: userId || null,
          ipAddress,
          userAgent,
          referrer,
        },
      });

      // Increment view count
      await this.prisma.document.update({
        where: { id: documentId },
        data: { viewCount: { increment: 1 } },
      });

      this.logger.log(`View tracked successfully for document ${documentId}`);

      return {
        success: true,
        message: 'View tracked successfully',
      };
    } catch (error) {
      this.logger.error(`Error tracking view for document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to track document view');
    }
  }

  /**
   * Get document details with files
   */
  async getDocumentById(documentId: string, userId?: string, shareToken?: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          category: true,
          files: {
            include: {
              file: true,
            },
            orderBy: { order: 'asc' },
          },
          shareLink: true,
          _count: {
            select: {
              ratings: true,
              comments: true,
              views: true,

              downloads: true,
            },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      const isOwner = document.uploaderId === userId;
      let shareAccessGranted = false;
      let activeShareLink: DocumentShareLink | null = null;

      if (shareToken) {
        activeShareLink = await this.validateShareLink(documentId, shareToken);
        shareAccessGranted = true;
      }

      // Check access permissions
      if (!document.isPublic && !isOwner && !shareAccessGranted) {
        throw new BadRequestException('Document is not public');
      }

      // Prepare file data without secure URLs first
      const filesData =
        (document as any).files?.map((df: any) => ({
          id: df.file.id,
          originalName: df.file.originalName,
          fileName: df.file.fileName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          thumbnailUrl: df.file.thumbnailUrl,
          order: df.order,
        })) || [];

      // Add secure URLs to files
      const filesWithSecureUrls = await this.filesService.addSecureUrlsToFiles(filesData, {
        userId,
        allowSharedAccess: isOwner || shareAccessGranted,
      });

      const response: any = {
        id: document.id,
        title: document.title,
        description: document.description,
        tags: document.tags,
        language: document.language,
        isPublic: document.isPublic,
        isPremium: document.isPremium,
        viewCount: document.viewCount,
        downloadCount: document.downloadCount,
        averageRating: document.averageRating,
        totalRatings: document.totalRatings,
        createdAt: document.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: document.updatedAt?.toISOString() || new Date().toISOString(),
        uploader: (document as any).uploader,
        category: (document as any).category,
        files: filesWithSecureUrls,
        stats: {
          ratingsCount: (document as any)._count?.ratings || 0,
          commentsCount: (document as any)._count?.comments || 0,
          viewsCount: (document as any)._count?.views || 0,
          downloadsCount: (document as any)._count?.downloads || 0,
        },
      };

      if (isOwner && document.shareLink) {
        response.shareLink = {
          token: document.shareLink.token,
          expiresAt: document.shareLink.expiresAt.toISOString(),
          isRevoked: document.shareLink.isRevoked,
        };
      } else if (shareAccessGranted && activeShareLink) {
        response.shareLink = {
          expiresAt: activeShareLink.expiresAt.toISOString(),
        };
      }

      return response;
    } catch (error) {
      this.logger.error(`Error getting document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get document');
    }
  }

  /**
   * Create or update a share link for a document
   */
  async createOrUpdateShareLink(
    documentId: string,
    userId: string,
    shareOptions: ShareDocumentDto
  ) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException('You do not have permission to share this document');
      }

      const now = new Date();
      let expiration: Date;

      if (shareOptions?.expiresAt) {
        expiration = new Date(shareOptions.expiresAt);
        if (Number.isNaN(expiration.getTime())) {
          throw new BadRequestException('Invalid expiration time');
        }
      } else {
        const durationMinutes =
          shareOptions?.expiresInMinutes && shareOptions.expiresInMinutes > 0
            ? shareOptions.expiresInMinutes
            : 60 * 24; // default 24 hours
        expiration = new Date(now.getTime() + durationMinutes * 60 * 1000);
      }

      if (expiration <= now) {
        throw new BadRequestException('Share link expiration must be in the future');
      }

      const existingShareLink = await this.prisma.documentShareLink.findUnique({
        where: { documentId },
      });

      let tokenToUse: string;
      if (!existingShareLink || shareOptions?.regenerateToken) {
        tokenToUse = this.generateShareToken();
      } else {
        tokenToUse = existingShareLink.token;
      }

      const shareLink = await this.prisma.documentShareLink.upsert({
        where: { documentId },
        update: {
          token: tokenToUse,
          expiresAt: expiration,
          isRevoked: false,
        },
        create: {
          documentId,
          token: tokenToUse,
          expiresAt: expiration,
          createdById: userId,
        },
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      const shareUrl = `${frontendUrl}/documents/${documentId}?apiKey=${shareLink.token}`;

      return {
        token: shareLink.token,
        expiresAt: shareLink.expiresAt.toISOString(),
        isRevoked: shareLink.isRevoked,
        shareUrl,
      };
    } catch (error) {
      this.logger.error(`Error creating/updating share link for document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create share link');
    }
  }

  /**
   * Revoke existing share link
   */
  async revokeShareLink(documentId: string, userId: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException('You do not have permission to revoke this share link');
      }

      await this.prisma.documentShareLink.updateMany({
        where: { documentId },
        data: { isRevoked: true },
      });
    } catch (error) {
      this.logger.error(`Error revoking share link for document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to revoke share link');
    }
  }

  /**
   * Validate share token for a document
   */
  async validateShareLink(documentId: string, token: string): Promise<DocumentShareLink> {
    try {
      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { token },
      });

      if (!shareLink || shareLink.documentId !== documentId) {
        throw new BadRequestException('Invalid share link');
      }

      if (shareLink.isRevoked) {
        throw new BadRequestException('Share link has been revoked');
      }

      if (shareLink.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Share link has expired');
      }

      return shareLink;
    } catch (error) {
      this.logger.error(
        `Error validating share link for document ${documentId} with token ${token}:`,
        error
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to validate share link');
    }
  }

  private generateShareToken(): string {
    return randomBytes(24).toString('hex');
  }

  /**
   * Download document - creates zip file with all document files and tracks download
   */
  async downloadDocument(
    documentId: string,
    userId?: string, // Make userId optional for guest users
    ipAddress?: string,
    userAgent?: string,
    referrer?: string
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    fileCount: number;
  }> {
    try {
      this.logger.log(`Preparing download for document ${documentId} by user ${userId || 'guest'}`);

      // Get document with files
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: {
              file: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      // Check access permissions - only check if user is authenticated
      if (!document.isPublic) {
        if (!userId) {
          throw new BadRequestException('Authentication required to download private documents');
        }
        if (document.uploaderId !== userId) {
          throw new BadRequestException('You do not have permission to download this document');
        }
      }

      if (!document.files || document.files.length === 0) {
        throw new BadRequestException('Document has no files to download');
      }

      // Create download record and increment counter in a transaction
      await this.prisma.$transaction(async (prisma) => {
        // Log download only if user is authenticated (for now, until prisma client is regenerated)
        if (userId) {
          await prisma.download.create({
            data: {
              userId,
              documentId,
              ipAddress,
              userAgent,
              referrer,
            },
          });
        }

        // Increment download count regardless of authentication
        await prisma.document.update({
          where: { id: documentId },
          data: {
            downloadCount: {
              increment: 1,
            },
          },
        });
      });

      // If single file, return direct download URL
      if (document.files.length === 1) {
        const file = document.files[0].file;
        this.logger.log(`Preparing single file download: ${file.originalName}`);
        const downloadUrl = await this.r2Service.getSignedDownloadUrl(file.storageUrl, 300); // 5 minutes

        this.logger.log(`Generated download URL: ${downloadUrl.substring(0, 100)}...`);

        return {
          downloadUrl,
          fileName: file.originalName,
          fileCount: 1,
        };
      }

      // For multiple files, create or use cached ZIP
      this.logger.log(`Preparing ZIP download for ${document.files.length} files`);

      // Check if ZIP file already exists and is still valid
      if (document.zipFileUrl) {
        this.logger.log(`Using cached ZIP file for document ${documentId}`);

        // Generate new signed URL for the existing ZIP file
        const zipDownloadUrl = await this.r2Service.getSignedDownloadUrl(document.zipFileUrl, 1800);
        const zipFileName = `${document.title || 'document'}.zip`;

        return {
          downloadUrl: zipDownloadUrl,
          fileName: zipFileName,
          fileCount: document.files.length,
        };
      }

      // Create new ZIP file
      const zipFileName = `${document.title || 'document'}.zip`;
      const zipDownloadUrl = await this.createZipDownload(
        document.files.map((df) => df.file),
        documentId
      );

      return {
        downloadUrl: zipDownloadUrl,
        fileName: zipFileName,
        fileCount: document.files.length,
      };
    } catch (error) {
      this.logger.error(`Error preparing download for document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to prepare document download');
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, userId: string) {
    try {
      this.logger.log(`Deleting document ${documentId} by user ${userId}`);

      // Check if document exists and belongs to user
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: {
              file: true,
            },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Document not found');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException('You do not have permission to delete this document');
      }

      // Delete document and related records in a transaction
      await this.prisma.$transaction(async (prisma) => {
        // Delete document files relationships
        await prisma.documentFile.deleteMany({
          where: { documentId },
        });

        // Delete document views
        await prisma.view.deleteMany({
          where: { documentId },
        });

        // Delete document downloads
        await prisma.download.deleteMany({
          where: { documentId },
        });

        // Delete document ratings
        await prisma.rating.deleteMany({
          where: { documentId },
        });

        // Delete document comments
        await prisma.comment.deleteMany({
          where: { documentId },
        });

        // Delete AI analysis if exists
        await prisma.aIAnalysis.deleteMany({
          where: { documentId },
        });

        // Delete the document itself
        await prisma.document.delete({
          where: { id: documentId },
        });
      });

      this.logger.log(`Document ${documentId} deleted successfully`);
      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete document');
    }
  }

  /**
   * Create ZIP file download URL for multiple files
   */
  private async createZipDownload(files: any[], documentId: string): Promise<string> {
    try {
      this.logger.log(
        `Creating new ZIP file for document ${documentId} with ${files.length} files`
      );

      if (files.length === 0) {
        throw new Error('No files to zip');
      }

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      // Collect ZIP data
      archive.on('data', (chunk) => {
        chunks.push(chunk);
      });

      // Handle ZIP completion
      const zipPromise = new Promise<Buffer>((resolve, reject) => {
        archive.on('end', () => {
          const zipBuffer = Buffer.concat(chunks);
          this.logger.log(`ZIP created successfully, size: ${zipBuffer.length} bytes`);
          resolve(zipBuffer);
        });

        archive.on('error', (error) => {
          this.logger.error('ZIP creation error:', error);
          reject(error);
        });
      });

      // Add files to ZIP
      for (const file of files) {
        try {
          this.logger.log(`Adding file to ZIP: ${file.originalName}`);

          // Get file stream from R2
          const fileStream = await this.r2Service.getFileStream(file.storageUrl);

          // Add file to archive
          archive.append(fileStream, { name: file.originalName });
        } catch (fileError) {
          this.logger.error(`Error adding file ${file.originalName} to ZIP:`, fileError);
          // Continue with other files instead of failing completely
        }
      }

      // Finalize ZIP
      await archive.finalize();

      // Wait for ZIP completion
      const zipBuffer = await zipPromise;

      // Upload ZIP to R2 and get signed URL
      const zipKey = `downloads/zip-${Date.now()}-${Math.random().toString(36).substring(7)}.zip`;
      await this.r2Service.uploadBuffer(zipBuffer, zipKey, 'application/zip');

      // Create storage URL using public URL and get signed URL for the ZIP file (30 minutes expiry)
      const publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');
      const storageUrl = publicUrl
        ? `${publicUrl}/${zipKey}`
        : `${this.configService.get('CLOUDFLARE_R2_ENDPOINT')}/${this.r2Service.bucketName}/${zipKey}`;

      // Save ZIP file URL to document for caching
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          zipFileUrl: storageUrl,
          zipFileCreatedAt: new Date(),
        },
      });

      const zipUrl = await this.r2Service.getSignedDownloadUrl(storageUrl, 1800);

      this.logger.log(
        `ZIP uploaded, cached, and signed URL generated: ${zipUrl.substring(0, 100)}...`
      );

      return zipUrl;
    } catch (error) {
      this.logger.error('Error creating ZIP download:', error);
      throw new InternalServerErrorException('Failed to create ZIP download');
    }
  }
}
