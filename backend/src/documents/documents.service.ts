import * as archiver from 'archiver'
import { randomBytes } from 'crypto'

import { NotificationsService } from '@/notifications/notifications.service'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentModerationStatus, DocumentShareLink, Prisma } from '@prisma/client'

import { AIService } from '../ai/ai.service'
import { CloudflareR2Service } from '../common/cloudflare-r2.service'
import { SystemSettingsService } from '../common/system-settings.service'
import { FilesService } from '../files/files.service'
import { PrismaService } from '../prisma/prisma.service'
import { SimilarityJobService } from '../similarity/similarity-job.service'
import { CreateDocumentDto } from './dto/create-document.dto'
import { ShareDocumentDto } from './dto/share-document.dto'

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private r2Service: CloudflareR2Service,
    private configService: ConfigService,
    private aiService: AIService,
    private notifications: NotificationsService,
    private systemSettings: SystemSettingsService,
    private similarityJobService: SimilarityJobService,
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

      this.logger.log(
        `Creating document for user ${userId} with files: ${fileIds.join(', ')}`,
      );

      // Validate that all files exist and belong to the user
      const files = await this.prisma.file.findMany({
        where: { id: { in: fileIds }, uploaderId: userId },
      });

      if (files.length !== fileIds.length) {
        this.logger.error(
          `Files validation failed. Found ${files.length} files, expected ${fileIds.length}`,
        );

        throw new BadRequestException(
          'Một số tệp không tìm thấy hoặc không thuộc về người dùng',
        );
      }

      this.logger.log(
        `Files validated successfully: ${files.map(f => f.originalName).join(', ')}`,
      );

      // Get or create default category
      const category = categoryId
        ? await this.prisma.category.findUnique({ where: { id: categoryId } })
        : await this.getOrCreateDefaultCategory();

      if (!category) {
        this.logger.error(`Category not found: ${categoryId}`);
        throw new BadRequestException('Không tìm thấy danh mục');
      }

      this.logger.log(`Using category: ${category.name} (${category.id})`);

      const wantsPublic = Boolean(isPublic);
      const moderationStatus = wantsPublic
        ? DocumentModerationStatus.PENDING
        : DocumentModerationStatus.APPROVED;

      // Create one document with multiple files
      const document = await this.prisma.document.create({
        data: {
          title,
          description,
          uploaderId: userId,
          categoryId: category.id,
          isPublic: wantsPublic,
          isApproved: !wantsPublic,
          moderationStatus,
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
          }),
        ),
      );

      this.logger.log(
        `Document-file relationships created: ${documentFiles.length} files`,
      );

      // Save AI analysis if provided
      if (
        useAI &&
        aiAnalysis &&
        aiAnalysis.confidence &&
        aiAnalysis.confidence > 0
      ) {
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

      // Automatically trigger AI analysis for public documents when not provided
      if (wantsPublic && (!useAI || !aiAnalysis)) {
        try {
          const aiResult = await this.aiService.analyzeDocuments({
            fileIds,
            userId,
          });

          if (aiResult.success && aiResult.data) {
            await this.aiService.saveAnalysis(document.id, aiResult.data);
            this.logger.log(
              `AI moderation analysis generated for document ${document.id}`,
            );

            // Apply AI moderation settings based on analysis score
            try {
              const moderationScore = aiResult.data.moderationScore || 50; // Default score if not provided
              const moderationResult =
                await this.aiService.applyModerationSettings(
                  document.id,
                  moderationScore,
                );

              this.logger.log(
                `AI moderation applied for document ${document.id}: ${moderationResult.status} (${moderationResult.action})`,
              );

              // Update document status if auto-approved or auto-rejected
              if (
                moderationResult.status === 'approved' ||
                moderationResult.status === 'rejected'
              ) {
                const isApproved = moderationResult.status === 'approved';
                const moderatedAt = new Date();
                const moderationNotes = `AI Tự động ${moderationResult.action === 'auto_approved' ? 'phê duyệt' : 'từ chối'}: Điểm ${moderationScore}% - ${moderationResult.reason || 'Không có lý do'}`;

                await this.prisma.document.update({
                  where: { id: document.id },
                  data: {
                    moderationStatus:
                      moderationResult.status === 'approved'
                        ? 'APPROVED'
                        : 'REJECTED',
                    isApproved,
                    moderatedAt,
                    moderationNotes,
                  },
                });
                this.logger.log(
                  `Document ${document.id} status updated to ${moderationResult.status} with moderation notes: ${moderationNotes}`,
                );

                // Send notification to document uploader
                try {
                  await this.notifications.emitToUploaderOfDocument(
                    document.uploaderId,
                    {
                      type: 'moderation',
                      documentId: document.id,
                      status:
                        moderationResult.status === 'approved'
                          ? 'approved'
                          : 'rejected',
                      notes: moderationNotes,
                      reason: moderationResult.reason,
                    },
                  );
                  this.logger.log(
                    `Moderation notification sent and saved to database for user ${document.uploaderId} for document ${document.id}`,
                  );
                } catch (notificationError) {
                  this.logger.warn(
                    `Failed to send moderation notification for document ${document.id}: ${notificationError.message}`,
                  );
                }
              }
            } catch (moderationError) {
              this.logger.warn(
                `Failed to apply AI moderation for document ${document.id}: ${moderationError.message}`,
              );
            }
          } else {
            this.logger.warn(
              `AI analysis skipped or failed for document ${document.id}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Unable to generate AI analysis automatically for document ${document.id}: ${error.message}`,
          );
        }
      }

      // Queue similarity detection for background processing
      if (wantsPublic) {
        try {
          await this.similarityJobService.queueSimilarityDetection(document.id);
          this.logger.log(
            `Queued similarity detection for document ${document.id}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to queue similarity detection for document ${document.id}: ${error.message}`,
          );
        }
      }

      // Return document with files
      const result = {
        ...document,
        files: documentFiles.map(df => df.file),
      };

      this.logger.log(
        `Document creation completed successfully: ${document.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Error creating document:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Đã xảy ra lỗi khi tạo tài liệu');
    }
  }

  /**
   * Comments: list for a document
   */
  async getComments(documentId: string) {
    try {
      const comments = await this.prisma.comment.findMany({
        where: { documentId, isDeleted: false },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          replies: {
            where: { isDeleted: false },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return comments;
    } catch (error) {
      this.logger.error(
        `Error getting comments for document ${documentId}:`,
        error,
      );
      throw new InternalServerErrorException('Không thể lấy bình luận');
    }
  }

  /**
   * Comments: add
   */
  async addComment(
    documentId: string,
    userId: string,
    dto: { content: string; parentId?: string },
  ) {
    try {
      // ensure document exists
      const exists = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true },
      });
      if (!exists) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const comment = await this.prisma.comment.create({
        data: {
          documentId,
          userId,
          parentId: dto.parentId || null,
          content: dto.content,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      return comment;
    } catch (error) {
      this.logger.error(
        `Error adding comment for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể thêm bình luận');
    }
  }

  /**
   * Comments: like
   */
  async likeComment(documentId: string, commentId: string, userId: string) {
    try {
      const comment = await this.prisma.comment.findFirst({
        where: { id: commentId, documentId },
      });
      if (!comment) throw new BadRequestException('Không tìm thấy bình luận');

      // upsert like
      await this.prisma.commentLike.upsert({
        where: { userId_commentId: { userId, commentId } },
        update: {},
        create: { userId, commentId },
      });

      const updated = await this.prisma.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
      });
      return updated;
    } catch (error) {
      this.logger.error(`Error liking comment ${commentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể thích bình luận');
    }
  }

  /**
   * Comments: edit
   */
  async editComment(
    documentId: string,
    commentId: string,
    userId: string,
    dto: { content: string },
  ) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
      });
      if (!comment || comment.documentId !== documentId) {
        throw new BadRequestException('Không tìm thấy bình luận');
      }
      if (comment.userId !== userId) {
        throw new BadRequestException('Bạn không có quyền sửa bình luận này');
      }

      const updated = await this.prisma.comment.update({
        where: { id: commentId },
        data: { content: dto.content, isEdited: true, editedAt: new Date() },
      });
      return updated;
    } catch (error) {
      this.logger.error(`Error editing comment ${commentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể sửa bình luận');
    }
  }

  /**
   * Comments: delete (soft)
   */
  async deleteComment(documentId: string, commentId: string, userId: string) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
      });
      if (!comment || comment.documentId !== documentId) {
        throw new BadRequestException('Không tìm thấy bình luận');
      }
      if (comment.userId !== userId) {
        throw new BadRequestException('Bạn không có quyền xóa bình luận này');
      }

      await this.prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
    } catch (error) {
      this.logger.error(`Error deleting comment ${commentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể xóa bình luận');
    }
  }

  /**
   * Ratings: get current user's rating
   */
  async getUserRating(documentId: string, userId: string) {
    try {
      const rating = await this.prisma.rating.findUnique({
        where: { userId_documentId: { userId, documentId } },
        select: { rating: true },
      });
      return { rating: rating?.rating || 0 };
    } catch (error) {
      this.logger.error(
        `Error getting user rating for document ${documentId}:`,
        error,
      );
      throw new InternalServerErrorException('Không thể lấy đánh giá');
    }
  }

  /**
   * Ratings: set current user's rating and update document aggregates
   */
  async setUserRating(documentId: string, userId: string, ratingValue: number) {
    try {
      // upsert rating
      const existing = await this.prisma.rating.findUnique({
        where: { userId_documentId: { userId, documentId } },
      });

      if (existing) {
        await this.prisma.rating.update({
          where: { userId_documentId: { userId, documentId } },
          data: { rating: ratingValue },
        });
      } else {
        await this.prisma.rating.create({
          data: { userId, documentId, rating: ratingValue },
        });
      }

      // recompute aggregates
      const agg = await this.prisma.rating.aggregate({
        where: { documentId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          averageRating: agg._avg.rating || 0,
          totalRatings: agg._count.rating || 0,
        },
      });

      return { rating: ratingValue };
    } catch (error) {
      this.logger.error(
        `Error setting rating for document ${documentId}:`,
        error,
      );
      throw new InternalServerErrorException('Không thể cập nhật đánh giá');
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
      throw new BadRequestException('Không tìm thấy tài liệu');
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
      files: document.files.map(df => ({
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
      where: { name: 'Tổng hợp' },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          name: 'Tổng hợp',
          description: 'Danh mục mặc định cho tài liệu',
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

      this.logger.log(
        `Getting documents for user ${userId}, page ${page}, limit ${limit}`,
      );

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
        documents.map(async document => {
          const filesData = document.files.map(df => ({
            id: df.file.id,
            originalName: df.file.originalName,
            fileName: df.file.fileName,
            mimeType: df.file.mimeType,
            fileSize: df.file.fileSize,
            order: df.order,
          }));

          const filesWithSecureUrls =
            await this.filesService.addSecureUrlsToFiles(filesData, {
              userId,
            });

          return {
            id: document.id,
            title: document.title,
            description: document.description,
            isPublic: document.isPublic,
            isApproved: document.isApproved,
            moderationStatus: document.moderationStatus,
            moderatedAt: document.moderatedAt
              ? document.moderatedAt.toISOString()
              : null,
            moderatedById: document.moderatedById,
            moderationNotes: document.moderationNotes,
            rejectionReason: document.rejectionReason,
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
        }),
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error getting user documents:', error);
      throw new InternalServerErrorException(
        'Không thể lấy tài liệu người dùng',
      );
    }
  }

  /**
   * Get public documents with pagination
   */
  async getPublicDocuments(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    userRole?: string,
  ) {
    try {
      console.log('userId', userId);
      console.log('userRole', userRole);

      const skip = (page - 1) * limit;

      this.logger.log(`Getting public documents, page ${page}, limit ${limit}`);

      // Only return documents that are approved and public
      const whereCondition = {
        isPublic: true,
        isApproved: true,
        moderationStatus: DocumentModerationStatus.APPROVED,
      };

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: whereCondition,
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
          where: whereCondition,
        }),
      ]);

      // Transform the data and add secure URLs
      const transformedDocuments = await Promise.all(
        documents.map(async document => {
          const filesData = document.files.map(df => ({
            id: df.file.id,
            originalName: df.file.originalName,
            fileName: df.file.fileName,
            mimeType: df.file.mimeType,
            fileSize: df.file.fileSize,
            order: df.order,
          }));

          const filesWithSecureUrls =
            await this.filesService.addSecureUrlsToFiles(filesData, {
              userId,
            });

          return {
            id: document.id,
            title: document.title,
            description: document.description,
            isPublic: document.isPublic,
            isApproved: document.isApproved,
            moderationStatus: document.moderationStatus,
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
        }),
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error getting public documents:', error);
      throw new InternalServerErrorException(
        'Không thể lấy tài liệu công khai',
      );
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
    referrer?: string,
  ) {
    try {
      this.logger.log(
        `Tracking view for document ${documentId} by user ${userId || 'anonymous'}`,
      );

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
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      // Check access permissions
      if (!document.isPublic && document.uploaderId !== userId) {
        throw new BadRequestException('Tài liệu không công khai');
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
      this.logger.error(
        `Error tracking view for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể theo dõi lượt xem tài liệu',
      );
    }
  }

  /**
   * Get document details with files
   */
  async getDocumentById(
    documentId: string,
    userId?: string,
    shareToken?: string,
    apiKey?: string,
  ) {
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
          aiAnalysis: true,
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
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const isOwner = document.uploaderId === userId;
      let shareAccessGranted = false;
      let activeShareLink: DocumentShareLink | null = null;
      let isApiKeyAccess = false;

      if (shareToken) {
        activeShareLink = await this.validateShareLink(documentId, shareToken);
        shareAccessGranted = true;
      }

      if (apiKey) {
        // API key access - only allow if document is public
        if (!document.isPublic) {
          throw new BadRequestException(
            'Tài liệu riêng tư không thể truy cập qua API key',
          );
        }
        isApiKeyAccess = true;
      }

      // Check access permissions
      if (
        !document.isPublic &&
        !isOwner &&
        !shareAccessGranted &&
        !isApiKeyAccess
      ) {
        throw new BadRequestException('Tài liệu không công khai');
      }

      if (
        document.isPublic &&
        !document.isApproved &&
        !isOwner &&
        !shareAccessGranted &&
        !isApiKeyAccess
      ) {
        throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
      }

      if (
        document.moderationStatus === DocumentModerationStatus.REJECTED &&
        !isOwner
      ) {
        throw new BadRequestException('Tài liệu đã bị từ chối');
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
      const filesWithSecureUrls = await this.filesService.addSecureUrlsToFiles(
        filesData,
        {
          userId,
          allowSharedAccess: isOwner || shareAccessGranted,
        },
      );

      const response: any = {
        id: document.id,
        title: document.title,
        description: document.description,
        tags: document.tags,
        language: document.language,
        isPublic: document.isPublic,
        isPremium: document.isPremium,
        isApproved: document.isApproved,
        moderationStatus: document.moderationStatus,
        moderationNotes: document.moderationNotes,
        rejectionReason: document.rejectionReason,
        moderatedAt: document.moderatedAt
          ? document.moderatedAt.toISOString()
          : null,
        moderatedById: document.moderatedById,
        viewCount: document.viewCount,
        downloadCount: document.downloadCount,
        averageRating: document.averageRating,
        totalRatings: document.totalRatings,
        createdAt:
          document.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt:
          document.updatedAt?.toISOString() || new Date().toISOString(),
        uploader: (document as any).uploader,
        category: (document as any).category,
        files: filesWithSecureUrls,
        stats: {
          ratingsCount: (document as any)._count?.ratings || 0,
          commentsCount: (document as any)._count?.comments || 0,
          viewsCount: (document as any)._count?.views || 0,
          downloadsCount: (document as any)._count?.downloads || 0,
        },
        aiAnalysis: (document as any).aiAnalysis || null,
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
      throw new InternalServerErrorException('Không thể lấy tài liệu');
    }
  }

  /**
   * Create or update a share link for a document
   */
  async createOrUpdateShareLink(
    documentId: string,
    userId: string,
    shareOptions: ShareDocumentDto,
  ) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException(
          'Bạn không có quyền chia sẻ tài liệu này',
        );
      }

      const now = new Date();
      let expiration: Date;

      if (shareOptions?.expiresAt) {
        expiration = new Date(shareOptions.expiresAt);
        if (Number.isNaN(expiration.getTime())) {
          throw new BadRequestException('Thời gian hết hạn không hợp lệ');
        }
      } else {
        const durationMinutes =
          shareOptions?.expiresInMinutes && shareOptions.expiresInMinutes > 0
            ? shareOptions.expiresInMinutes
            : 60 * 24; // default 24 hours
        expiration = new Date(now.getTime() + durationMinutes * 60 * 1000);
      }

      if (expiration <= now) {
        throw new BadRequestException(
          'Thời gian hết hạn liên kết chia sẻ phải ở tương lai',
        );
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

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      const shareUrl = `${frontendUrl}/documents/${documentId}?apiKey=${shareLink.token}`;

      return {
        token: shareLink.token,
        expiresAt: shareLink.expiresAt.toISOString(),
        isRevoked: shareLink.isRevoked,
        shareUrl,
      };
    } catch (error) {
      this.logger.error(
        `Error creating/updating share link for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể tạo liên kết chia sẻ');
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
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException(
          'Bạn không có quyền thu hồi liên kết chia sẻ này',
        );
      }

      await this.prisma.documentShareLink.updateMany({
        where: { documentId },
        data: { isRevoked: true },
      });
    } catch (error) {
      this.logger.error(
        `Error revoking share link for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể thu hồi liên kết chia sẻ',
      );
    }
  }

  /**
   * Validate share token for a document
   */
  async validateShareLink(
    documentId: string,
    token: string,
  ): Promise<DocumentShareLink> {
    try {
      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { token },
      });

      if (!shareLink || shareLink.documentId !== documentId) {
        throw new BadRequestException('Liên kết chia sẻ không hợp lệ');
      }

      if (shareLink.isRevoked) {
        throw new BadRequestException('Liên kết chia sẻ đã bị thu hồi');
      }

      if (shareLink.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Liên kết chia sẻ đã hết hạn');
      }

      return shareLink;
    } catch (error) {
      this.logger.error(
        `Error validating share link for document ${documentId} with token ${token}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể xác thực liên kết chia sẻ',
      );
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
    referrer?: string,
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    fileCount: number;
  }> {
    try {
      this.logger.log(
        `Preparing download for document ${documentId} by user ${userId || 'guest'}`,
      );

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
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const isOwner = document.uploaderId === userId;

      if (document.isPublic) {
        if (!document.isApproved && !isOwner) {
          throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
        }
        if (
          document.moderationStatus === DocumentModerationStatus.REJECTED &&
          !isOwner
        ) {
          throw new BadRequestException('Tài liệu đã bị từ chối');
        }
      } else {
        if (!userId) {
          throw new BadRequestException(
            'Cần xác thực để tải xuống tài liệu riêng tư',
          );
        }
        if (!isOwner) {
          throw new BadRequestException(
            'Bạn không có quyền tải xuống tài liệu này',
          );
        }
      }

      if (!document.files || document.files.length === 0) {
        throw new BadRequestException('Tài liệu không có tệp để tải xuống');
      }

      // Create download record and increment counter in a transaction
      await this.prisma.$transaction(async prisma => {
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

      // Emit realtime download event to uploader
      this.notifications.emitToUploaderOfDocument(document.uploaderId, {
        type: 'download',
        documentId,
        userId,
        count: 1,
      });

      // If single file, return direct download URL
      if (document.files.length === 1) {
        const file = document.files[0].file;
        this.logger.log(`Preparing single file download: ${file.originalName}`);
        const downloadUrl = await this.r2Service.getSignedDownloadUrl(
          file.storageUrl,
          300,
        ); // 5 minutes

        this.logger.log(
          `Generated download URL: ${downloadUrl.substring(0, 100)}...`,
        );

        return {
          downloadUrl,
          fileName: file.originalName,
          fileCount: 1,
        };
      }

      // For multiple files, create or use cached ZIP
      this.logger.log(
        `Preparing ZIP download for ${document.files.length} files`,
      );

      // Check if ZIP file already exists and is still valid
      if (document.zipFileUrl) {
        this.logger.log(`Using cached ZIP file for document ${documentId}`);

        // Generate new signed URL for the existing ZIP file
        const zipDownloadUrl = await this.r2Service.getSignedDownloadUrl(
          document.zipFileUrl,
          1800,
        );
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
        document.files.map(df => df.file),
        documentId,
      );

      return {
        downloadUrl: zipDownloadUrl,
        fileName: zipFileName,
        fileCount: document.files.length,
      };
    } catch (error) {
      this.logger.error(
        `Error preparing download for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể chuẩn bị tải xuống tài liệu',
      );
    }
  }

  /**
   * Get moderation queue data for admin review
   */
  async getModerationQueue(options: {
    page?: number;
    limit?: number;
    categoryId?: string;
    uploaderId?: string;
    status?: DocumentModerationStatus;
    sort?: 'createdAt' | 'title' | 'uploader';
    order?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      uploaderId,
      status = DocumentModerationStatus.PENDING,
      sort = 'createdAt',
      order = 'desc',
    } = options;

    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      isPublic: true,
      moderationStatus: status,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (uploaderId) {
      where.uploaderId = uploaderId;
    }

    const orderBy: Prisma.DocumentOrderByWithRelationInput =
      sort === 'title'
        ? { title: order }
        : sort === 'uploader'
          ? { uploader: { username: order } }
          : { createdAt: order };

    try {
      const [
        documents,
        total,
        pendingDocuments,
        rejectedDocuments,
        approvedToday,
      ] = await Promise.all([
        this.prisma.document.findMany({
          where,
          include: {
            files: {
              include: {
                file: true,
              },
              orderBy: { order: 'asc' },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            uploader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                email: true,
                isVerified: true,
              },
            },
            aiAnalysis: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.document.count({ where }),
        this.prisma.document.count({
          where: {
            isPublic: true,
            moderationStatus: DocumentModerationStatus.PENDING,
          },
        }),
        this.prisma.document.count({
          where: {
            isPublic: true,
            moderationStatus: DocumentModerationStatus.REJECTED,
          },
        }),
        this.prisma.document.count({
          where: {
            isPublic: true,
            moderationStatus: DocumentModerationStatus.APPROVED,
            moderatedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      const mappedDocuments = documents.map(document => ({
        id: document.id,
        title: document.title,
        description: document.description,
        isPublic: document.isPublic,
        isApproved: document.isApproved,
        moderationStatus: document.moderationStatus,
        moderatedAt: document.moderatedAt
          ? document.moderatedAt.toISOString()
          : null,
        moderatedById: document.moderatedById,
        moderationNotes: document.moderationNotes,
        rejectionReason: document.rejectionReason,
        tags: document.tags,
        language: document.language,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        category: document.category,
        uploader: document.uploader,
        aiAnalysis: document.aiAnalysis
          ? {
              summary: document.aiAnalysis.summary,
              keyPoints: document.aiAnalysis.keyPoints,
              difficulty: document.aiAnalysis.difficulty,
              confidence: document.aiAnalysis.confidence,
              reliabilityScore:
                (document as any).aiAnalysis?.reliabilityScore ?? 0,
              // Enhanced moderation fields
              moderationScore: document.aiAnalysis.moderationScore,
              safetyFlags: document.aiAnalysis.safetyFlags,
              isSafe: document.aiAnalysis.isSafe,
              recommendedAction: document.aiAnalysis.recommendedAction,
            }
          : null,
        files: document.files.map(df => ({
          id: df.file.id,
          originalName: df.file.originalName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          order: df.order,
          thumbnailUrl: df.file.thumbnailUrl,
        })),
      }));

      const totalPages = Math.max(1, Math.ceil(total / limit));

      return {
        summary: {
          pendingDocuments,
          rejectedDocuments,
          approvedToday,
        },
        documents: mappedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Error getting moderation queue:', error);
      throw new InternalServerErrorException(
        'Không thể lấy danh sách tài liệu chờ duyệt',
      );
    }
  }

  /**
   * Get document detail for moderation
   */
  async getDocumentForModeration(documentId: string) {
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
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          files: {
            include: {
              file: true,
            },
            orderBy: { order: 'asc' },
          },
          aiAnalysis: true,
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const files = document.files.map(df => ({
        id: df.file.id,
        originalName: df.file.originalName,
        fileName: df.file.fileName,
        mimeType: df.file.mimeType,
        fileSize: df.file.fileSize,
        order: df.order,
        thumbnailUrl: df.file.thumbnailUrl,
      }));

      const filesWithSecureUrls = await this.filesService.addSecureUrlsToFiles(
        files,
        {
          allowSharedAccess: true,
        },
      );

      return {
        id: document.id,
        title: document.title,
        description: document.description,
        isPublic: document.isPublic,
        isApproved: document.isApproved,
        moderationStatus: document.moderationStatus,
        moderationNotes: document.moderationNotes,
        rejectionReason: document.rejectionReason,
        moderatedAt: document.moderatedAt
          ? document.moderatedAt.toISOString()
          : null,
        moderatedById: document.moderatedById,
        language: document.language,
        tags: document.tags,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        uploader: document.uploader,
        category: document.category,
        aiAnalysis: document.aiAnalysis || null,
        files: filesWithSecureUrls,
      };
    } catch (error) {
      this.logger.error(
        `Error getting moderation detail for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể lấy chi tiết tài liệu chờ duyệt',
      );
    }
  }

  /**
   * Approve a document and publish it
   */
  async approveDocumentModeration(
    documentId: string,
    adminId: string,
    options: { notes?: string; publish?: boolean } = {},
  ) {
    const publish = options.publish ?? true;

    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            select: {
              fileId: true,
            },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const updatedDocument = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          isApproved: true,
          isPublic: publish,
          moderationStatus: DocumentModerationStatus.APPROVED,
          moderatedById: adminId,
          moderatedAt: new Date(),
          moderationNotes: options.notes || null,
          rejectionReason: null,
        },
        include: {
          aiAnalysis: true,
        },
      });

      await this.prisma.file.updateMany({
        where: {
          id: {
            in: document.files.map(file => file.fileId),
          },
        },
        data: {
          isPublic: publish,
        },
      });

      // Emit moderation approved event to uploader
      this.notifications.emitToUploaderOfDocument(updatedDocument.uploaderId, {
        type: 'moderation',
        documentId,
        status: 'approved',
        notes: options.notes || null,
      });

      return updatedDocument;
    } catch (error) {
      this.logger.error(`Error approving document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể duyệt tài liệu này');
    }
  }

  /**
   * Reject a document and optionally add notes
   */
  async rejectDocumentModeration(
    documentId: string,
    adminId: string,
    options: { reason: string; notes?: string },
  ) {
    if (!options.reason) {
      throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
    }

    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            select: {
              fileId: true,
            },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const updatedDocument = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          isApproved: false,
          isPublic: false,
          moderationStatus: DocumentModerationStatus.REJECTED,
          moderatedById: adminId,
          moderatedAt: new Date(),
          moderationNotes: options.notes || null,
          rejectionReason: options.reason,
        },
        include: {
          aiAnalysis: true,
        },
      });

      await Promise.all([
        this.prisma.file.updateMany({
          where: {
            id: {
              in: document.files.map(file => file.fileId),
            },
          },
          data: {
            isPublic: false,
          },
        }),
        this.prisma.documentShareLink.updateMany({
          where: { documentId },
          data: { isRevoked: true },
        }),
      ]);

      // Emit moderation rejected event to uploader
      this.notifications.emitToUploaderOfDocument(updatedDocument.uploaderId, {
        type: 'moderation',
        documentId,
        status: 'rejected',
        notes: options.notes || null,
        reason: options.reason,
      });

      return updatedDocument;
    } catch (error) {
      this.logger.error(`Error rejecting document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể từ chối tài liệu này');
    }
  }

  /**
   * Check if document should be auto-approved or auto-rejected based on AI analysis
   */
  async checkAutoModeration(documentId: string): Promise<{
    shouldAutoApprove: boolean;
    shouldAutoReject: boolean;
    reason?: string;
  }> {
    try {
      const aiSettings = await this.systemSettings.getAIModerationSettings();

      const analysis = await this.prisma.aIAnalysis.findUnique({
        where: { documentId },
      });

      if (!analysis) {
        return {
          shouldAutoApprove: false,
          shouldAutoReject: false,
          reason: 'No AI analysis available',
        };
      }

      const { moderationScore, safetyFlags } = analysis;

      // Auto-reject if score is below threshold or has critical safety flags
      if (aiSettings.enableAutoRejection) {
        if (moderationScore < aiSettings.autoRejectThreshold) {
          return {
            shouldAutoApprove: false,
            shouldAutoReject: true,
            reason: `AI score ${moderationScore} below rejection threshold ${aiSettings.autoRejectThreshold}`,
          };
        }

        if (safetyFlags.length > 0) {
          return {
            shouldAutoApprove: false,
            shouldAutoReject: true,
            reason: `Safety flags detected: ${safetyFlags.join(', ')}`,
          };
        }
      }

      // Auto-approve if score is above threshold and no safety issues
      if (aiSettings.enableAutoApproval) {
        if (
          moderationScore >= aiSettings.autoApprovalThreshold &&
          safetyFlags.length === 0
        ) {
          return {
            shouldAutoApprove: true,
            shouldAutoReject: false,
            reason: `AI score ${moderationScore} above approval threshold ${aiSettings.autoApprovalThreshold}`,
          };
        }
      }

      return {
        shouldAutoApprove: false,
        shouldAutoReject: false,
        reason: 'Requires manual review',
      };
    } catch (error) {
      this.logger.error(
        `Error checking auto moderation for document ${documentId}:`,
        error,
      );
      return {
        shouldAutoApprove: false,
        shouldAutoReject: false,
        reason: 'Error checking auto moderation',
      };
    }
  }

  /**
   * Trigger AI moderation analysis for a document
   */
  async generateModerationAnalysis(documentId: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            select: {
              fileId: true,
            },
          },
          uploader: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const fileIds = document.files.map(file => file.fileId);

      if (!fileIds.length) {
        throw new BadRequestException('Tài liệu không có tệp để phân tích AI');
      }

      const analysisResult = await this.aiService.analyzeDocuments({
        fileIds,
        userId: document.uploader.id,
      });

      if (analysisResult.success) {
        await this.aiService.saveAnalysis(documentId, analysisResult.data);
      }

      const savedAnalysis = await this.prisma.aIAnalysis.findUnique({
        where: { documentId },
      });

      // Check for auto-moderation after AI analysis
      const autoModeration = await this.checkAutoModeration(documentId);
      let autoModerationResult: { action: string; reason: string } | null =
        null;

      if (autoModeration.shouldAutoApprove) {
        this.logger.log(
          `Auto-approving document ${documentId}: ${autoModeration.reason}`,
        );
        try {
          await this.approveDocumentModeration(documentId, 'system', {
            notes: `Tự động duyệt bởi AI: ${autoModeration.reason}`,
            publish: true,
          });
          autoModerationResult = {
            action: 'approved',
            reason: autoModeration.reason || 'Auto-approved by AI',
          };
        } catch (error) {
          this.logger.error(
            `Failed to auto-approve document ${documentId}:`,
            error,
          );
        }
      } else if (autoModeration.shouldAutoReject) {
        this.logger.log(
          `Auto-rejecting document ${documentId}: ${autoModeration.reason}`,
        );
        try {
          await this.rejectDocumentModeration(documentId, 'system', {
            reason: `Tự động từ chối bởi AI: ${autoModeration.reason}`,
            notes:
              'Tài liệu này đã được AI phân tích và tự động từ chối do không đáp ứng tiêu chuẩn an toàn.',
          });
          autoModerationResult = {
            action: 'rejected',
            reason: autoModeration.reason || 'Auto-rejected by AI',
          };
        } catch (error) {
          this.logger.error(
            `Failed to auto-reject document ${documentId}:`,
            error,
          );
        }
      }

      return {
        success: analysisResult.success,
        analysis: savedAnalysis,
        processedFiles: analysisResult.processedFiles,
        processingTime: analysisResult.processingTime,
        autoModeration: autoModerationResult,
      };
    } catch (error) {
      this.logger.error(
        `Error generating AI moderation analysis for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể phân tích AI cho tài liệu này',
      );
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
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException('Bạn không có quyền xóa tài liệu này');
      }

      // Delete document and related records in a transaction
      await this.prisma.$transaction(async prisma => {
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
      throw new InternalServerErrorException('Không thể xóa tài liệu');
    }
  }

  /**
   * Create ZIP file download URL for multiple files
   */
  private async createZipDownload(
    files: any[],
    documentId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Creating new ZIP file for document ${documentId} with ${files.length} files`,
      );

      if (files.length === 0) {
        throw new Error('No files to zip');
      }

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      // Collect ZIP data
      archive.on('data', chunk => {
        chunks.push(chunk);
      });

      // Handle ZIP completion
      const zipPromise = new Promise<Buffer>((resolve, reject) => {
        archive.on('end', () => {
          const zipBuffer = Buffer.concat(chunks);
          this.logger.log(
            `ZIP created successfully, size: ${zipBuffer.length} bytes`,
          );
          resolve(zipBuffer);
        });

        archive.on('error', error => {
          this.logger.error('ZIP creation error:', error);
          reject(error);
        });
      });

      // Add files to ZIP
      for (const file of files) {
        try {
          this.logger.log(`Adding file to ZIP: ${file.originalName}`);

          // Get file stream from R2
          const fileStream = await this.r2Service.getFileStream(
            file.storageUrl,
          );

          // Add file to archive
          archive.append(fileStream, { name: file.originalName });
        } catch (fileError) {
          this.logger.error(
            `Error adding file ${file.originalName} to ZIP:`,
            fileError,
          );
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
      const publicUrl = this.configService.get<string>(
        'CLOUDFLARE_R2_PUBLIC_URL',
      );
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

      const zipUrl = await this.r2Service.getSignedDownloadUrl(
        storageUrl,
        1800,
      );

      this.logger.log(
        `ZIP uploaded, cached, and signed URL generated: ${zipUrl.substring(0, 100)}...`,
      );

      return zipUrl;
    } catch (error) {
      this.logger.error('Error creating ZIP download:', error);
      throw new InternalServerErrorException('Không thể tạo tải xuống ZIP');
    }
  }

  /**
   * Get download URL for a document without tracking download
   */
  async getDownloadUrl(
    documentId: string,
    userId?: string,
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    fileCount: number;
  }> {
    try {
      this.logger.log(
        `Getting download URL for document ${documentId} by user ${userId || 'guest'}`,
      );

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
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const isOwner = document.uploaderId === userId;

      if (document.isPublic) {
        if (!document.isApproved && !isOwner) {
          throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
        }
        if (
          document.moderationStatus === DocumentModerationStatus.REJECTED &&
          !isOwner
        ) {
          throw new BadRequestException('Tài liệu đã bị từ chối');
        }
      } else {
        if (!userId) {
          throw new BadRequestException(
            'Cần xác thực để tải xuống tài liệu riêng tư',
          );
        }
        if (!isOwner) {
          throw new BadRequestException(
            'Bạn không có quyền tải xuống tài liệu này',
          );
        }
      }

      if (!document.files || document.files.length === 0) {
        throw new BadRequestException('Tài liệu không có tệp để tải xuống');
      }

      // If single file, return direct download URL
      if (document.files.length === 1) {
        const file = document.files[0].file;
        this.logger.log(
          `Preparing single file download URL: ${file.originalName}`,
        );
        const downloadUrl = await this.r2Service.getSignedDownloadUrl(
          file.storageUrl,
          300,
        ); // 5 minutes

        return {
          downloadUrl,
          fileName: file.originalName,
          fileCount: 1,
        };
      }

      // For multiple files, create or use cached ZIP
      this.logger.log(
        `Preparing ZIP download URL for ${document.files.length} files`,
      );

      // Check if ZIP file already exists and is still valid
      if (document.zipFileUrl) {
        this.logger.log(`Using cached ZIP file for document ${documentId}`);

        // Generate new signed URL for the existing ZIP file
        const zipDownloadUrl = await this.r2Service.getSignedDownloadUrl(
          document.zipFileUrl,
          1800,
        );
        const zipFileName = `${document.title || 'document'}.zip`;

        return {
          downloadUrl: zipDownloadUrl,
          fileName: zipFileName,
          fileCount: document.files.length,
        };
      }

      // Create new ZIP file
      const zipUrl = await this.createZipDownload(document.files, documentId);
      const zipFileName = `${document.title || 'document'}.zip`;

      return {
        downloadUrl: zipUrl,
        fileName: zipFileName,
        fileCount: document.files.length,
      };
    } catch (error) {
      this.logger.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Track download completion (without creating download URL)
   */
  async trackDownload(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Tracking download completion for document ${documentId} by user ${userId || 'guest'}`,
      );

      // Verify document exists and user has permission
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          isPublic: true,
          isApproved: true,
          moderationStatus: true,
          uploaderId: true,
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const isOwner = document.uploaderId === userId;

      if (document.isPublic) {
        if (!document.isApproved && !isOwner) {
          throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
        }
        if (
          document.moderationStatus === DocumentModerationStatus.REJECTED &&
          !isOwner
        ) {
          throw new BadRequestException('Tài liệu đã bị từ chối');
        }
      } else {
        if (!userId) {
          throw new BadRequestException(
            'Cần xác thực để tải xuống tài liệu riêng tư',
          );
        }
        if (!isOwner) {
          throw new BadRequestException(
            'Bạn không có quyền tải xuống tài liệu này',
          );
        }
      }

      // Create download record and increment counter in a transaction
      await this.prisma.$transaction(async prisma => {
        // Log download only if user is authenticated
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

      // Emit realtime download event to uploader
      this.notifications.emitToUploaderOfDocument(document.uploaderId, {
        type: 'download',
        documentId,
        userId,
        count: 1,
      });

      this.logger.log(
        `Successfully tracked download for document ${documentId}`,
      );
    } catch (error) {
      this.logger.error('Error tracking download:', error);
      throw error;
    }
  }
}
