import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { AIService } from '../ai/ai.service';
import { EmbeddingService } from '../ai/embedding.service';
import {
  HybridSearchResult,
  VectorSearchService,
} from '../ai/vector-search.service';
import { CategoriesService } from '../categories/categories.service';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { NotificationsService } from '@/notifications/notifications.service';
import { PointsService } from '@/points/points.service';
import { SimilarityJobService } from '@/similarity/similarity-job.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentModerationStatus,
  DocumentShareLink,
  Prisma,
} from '@prisma/client';
import * as archiver from 'archiver';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private r2Service: CloudflareR2Service,
    private configService: ConfigService,
    private aiService: AIService,
    private embeddingService: EmbeddingService,
    private vectorSearchService: VectorSearchService,
    private notifications: NotificationsService,
    private systemSettings: SystemSettingsService,
    private similarityJobService: SimilarityJobService,
    private pointsService: PointsService,
    private categoriesService: CategoriesService,
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
        downloadCost,
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

      // Determine category - use AI suggestion if not provided
      let finalCategoryId = categoryId;
      let suggestedCategory: {
        categoryId: string | null;
        categoryName: string | null;
        confidence: number;
        allSuggestions: Array<{
          id: string;
          name: string;
          icon: string | null;
          color: string | null;
          parentId: string | null;
          score: number;
          confidence: number;
        }>;
      } | null = null;

      if (!categoryId && (useAI || aiAnalysis)) {
        // Nếu không có categoryId và sử dụng AI, gợi ý category dựa trên nội dung
        this.logger.log(
          'No category provided, using AI to suggest category...',
        );

        const contentForSuggestion = {
          title: aiAnalysis?.title || title,
          description: aiAnalysis?.description || description,
          tags: aiAnalysis?.tags || tags,
          summary: aiAnalysis?.summary,
          keyPoints: aiAnalysis?.keyPoints,
        };

        try {
          suggestedCategory =
            await this.categoriesService.suggestBestCategoryFromContent(
              contentForSuggestion,
            );

          if (suggestedCategory?.categoryId) {
            finalCategoryId = suggestedCategory.categoryId;
            this.logger.log(
              `AI suggested category: ${suggestedCategory.categoryName} (confidence: ${suggestedCategory.confidence}%)`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to get AI category suggestion: ${error.message}`,
          );
        }
      }

      // Get or create default category if still not determined
      const category = finalCategoryId
        ? await this.prisma.category.findUnique({
            where: { id: finalCategoryId },
          })
        : await this.getOrCreateDefaultCategory();

      if (!category) {
        this.logger.error(`Category not found: ${finalCategoryId}`);
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
          downloadCost: downloadCost !== undefined ? downloadCost : null, // null = use system default
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

      // Award points for uploading a document
      try {
        await this.pointsService.awardOnUpload(userId, document.id);
      } catch (e) {
        this.logger.warn(
          `Failed to award points for upload of document ${document.id}: ${e?.message}`,
        );
      }

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

            // If category was not specified, try to suggest based on AI analysis
            if (!categoryId && !suggestedCategory) {
              try {
                const aiSuggestion =
                  await this.categoriesService.suggestBestCategoryFromContent({
                    title: aiResult.data.title || title,
                    description: aiResult.data.description || description,
                    tags: aiResult.data.tags || tags,
                    summary: aiResult.data.summary,
                    keyPoints: aiResult.data.keyPoints,
                  });

                if (
                  aiSuggestion.categoryId &&
                  aiSuggestion.categoryId !== category.id
                ) {
                  // Update document with suggested category
                  await this.prisma.document.update({
                    where: { id: document.id },
                    data: { categoryId: aiSuggestion.categoryId },
                  });
                  this.logger.log(
                    `Document ${document.id} category updated to AI suggested: ${aiSuggestion.categoryName} (confidence: ${aiSuggestion.confidence}%)`,
                  );
                  suggestedCategory = aiSuggestion;
                }
              } catch (catError) {
                this.logger.warn(
                  `Failed to suggest category for document ${document.id}: ${catError.message}`,
                );
              }
            }

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

      // Start similarity detection in background (fire and forget)
      if (wantsPublic) {
        // Don't await - let it run in background
        void this.similarityJobService
          .queueSimilarityDetection(document.id)
          .then(() => {
            // Process immediately instead of waiting for cron
            void this.similarityJobService.processPendingJobs().catch(err => {
              this.logger.error(
                `Failed to process similarity for document ${document.id}: ${err.message}`,
              );
            });
          })
          .catch(error => {
            this.logger.warn(
              `Failed to queue similarity detection for document ${document.id}: ${error.message}`,
            );
          });
      }

      // Generate document embedding for vector search (in background)
      // Only for approved/public documents to enable vector search
      if (document.isApproved && wantsPublic) {
        void this.generateDocumentEmbedding(document.id).catch(error => {
          this.logger.warn(
            `Failed to generate embedding for document ${document.id}: ${error.message}`,
          );
        });
      }

      // Return document with files
      const result = {
        ...document,
        files: documentFiles.map(df => df.file),
        // Include AI suggested category info if category was auto-selected
        aiSuggestedCategory: suggestedCategory
          ? {
              categoryId: suggestedCategory.categoryId,
              categoryName: suggestedCategory.categoryName,
              confidence: suggestedCategory.confidence,
              allSuggestions: suggestedCategory.allSuggestions,
            }
          : null,
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
  async getComments(documentId: string, userId?: string) {
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
          likes: userId
            ? {
                where: { userId },
                select: { userId: true },
              }
            : false,
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
              likes: userId
                ? {
                    where: { userId },
                    select: { userId: true },
                  }
                : false,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Transform to add isLiked field
      const transformComment = (comment: any) => ({
        ...comment,
        isLiked: userId ? comment.likes?.length > 0 : false,
        likes: undefined,
        replies: comment.replies?.map(transformComment),
      });

      return comments.map(transformComment);
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
      // ensure document exists and get uploader info
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, title: true, uploaderId: true },
      });
      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      // If this is a reply, get parent comment info
      let parentComment: { id: string; userId: string } | null = null;
      if (dto.parentId) {
        parentComment = await this.prisma.comment.findUnique({
          where: { id: dto.parentId },
          select: { id: true, userId: true },
        });
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

      const commenterName =
        comment.user.firstName && comment.user.lastName
          ? `${comment.user.firstName} ${comment.user.lastName}`
          : comment.user.username;

      const truncatedContent =
        comment.content.length > 100
          ? comment.content.substring(0, 100) + '...'
          : comment.content;

      // If this is a reply, notify the parent comment owner
      if (dto.parentId && parentComment && parentComment.userId !== userId) {
        await this.notifications.emitToUser(parentComment.userId, {
          type: 'reply',
          documentId,
          documentTitle: document.title,
          commentId: comment.id,
          parentCommentId: dto.parentId,
          replierName: commenterName,
          replierId: userId,
          content: truncatedContent,
        });

        this.logger.log(
          `Reply notification sent to comment owner ${parentComment.userId} for document ${documentId}`,
        );
      }

      // Send notification to document owner if commenter is not the owner
      // and it's not a reply to the document owner's comment (to avoid duplicate notifications)
      const shouldNotifyDocOwner =
        document.uploaderId &&
        document.uploaderId !== userId &&
        (!parentComment || parentComment.userId !== document.uploaderId);

      if (shouldNotifyDocOwner) {
        await this.notifications.emitToUser(document.uploaderId, {
          type: 'comment',
          documentId,
          documentTitle: document.title,
          commentId: comment.id,
          commenterName,
          commenterId: userId,
          content: truncatedContent,
          isReply: !!dto.parentId,
        });

        this.logger.log(
          `Comment notification sent to document owner ${document.uploaderId} for document ${documentId}`,
        );
      }

      // Broadcast new comment to all viewers of this document
      const commentWithIsLiked = { ...comment, isLiked: false };
      this.notifications.emitToDocument(documentId, {
        type: 'new_comment',
        documentId,
        comment: commentWithIsLiked,
      });

      // Return comment with isLiked set to false (new comment is never liked yet)
      return commentWithIsLiked;
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
   * Comments: toggle like (like/unlike)
   */
  async likeComment(documentId: string, commentId: string, userId: string) {
    try {
      // Get comment with user info and document info
      const comment = await this.prisma.comment.findFirst({
        where: { id: commentId, documentId },
        include: {
          user: {
            select: { id: true },
          },
          document: {
            select: { id: true, title: true },
          },
        },
      });
      if (!comment) throw new BadRequestException('Không tìm thấy bình luận');

      // Check if user already liked this comment
      const existingLike = await this.prisma.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });

      if (existingLike) {
        // Unlike: remove the like
        await this.prisma.commentLike.delete({
          where: { userId_commentId: { userId, commentId } },
        });

        const updated = await this.prisma.comment.update({
          where: { id: commentId },
          data: { likesCount: { decrement: 1 } },
        });

        // Broadcast like update to all viewers
        this.notifications.emitToDocument(documentId, {
          type: 'comment_updated',
          documentId,
          commentId,
          likesCount: updated.likesCount,
          isLiked: false,
          likerId: userId,
        });

        return { ...updated, isLiked: false };
      } else {
        // Like: create the like
        await this.prisma.commentLike.create({
          data: { userId, commentId },
        });

        const updated = await this.prisma.comment.update({
          where: { id: commentId },
          data: { likesCount: { increment: 1 } },
        });

        // Broadcast like update to all viewers
        this.notifications.emitToDocument(documentId, {
          type: 'comment_updated',
          documentId,
          commentId,
          likesCount: updated.likesCount,
          isLiked: true,
          likerId: userId,
        });

        // Send notification to comment owner if liker is not the owner (only on first like)
        if (comment.userId !== userId) {
          const liker = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, firstName: true, lastName: true },
          });

          const likerName =
            liker?.firstName && liker?.lastName
              ? `${liker.firstName} ${liker.lastName}`
              : liker?.username || 'Người dùng';

          await this.notifications.emitToUser(comment.userId, {
            type: 'comment_like',
            documentId,
            documentTitle: comment.document.title,
            commentId,
            likerName,
            likerId: userId,
          });

          this.logger.log(
            `Like notification sent to comment owner ${comment.userId} for comment ${commentId}`,
          );
        }

        return { ...updated, isLiked: true };
      }
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
   * Get public documents with pagination and filters
   */
  async getPublicDocuments(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    userRole?: string,
    filters?: {
      categoryId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    try {
      console.log('userId', userId);
      console.log('userRole', userRole);

      const skip = (page - 1) * limit;

      this.logger.log(
        `Getting public documents, page ${page}, limit ${limit}, filters: ${JSON.stringify(filters)}`,
      );

      // Build where condition with filters
      const whereCondition: any = {
        isPublic: true,
        isApproved: true,
        moderationStatus: DocumentModerationStatus.APPROVED,
      };

      // Apply category filter
      if (filters?.categoryId) {
        whereCondition.categoryId = filters.categoryId;
      }

      // Build orderBy
      const sortBy = filters?.sortBy || 'createdAt';
      const sortOrder = filters?.sortOrder || 'desc';
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

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
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.document.count({
          where: whereCondition,
        }),
      ]);

      // Get download cost settings
      const settings = await this.systemSettings.getPointsSettings();

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

          const isOwner = document.uploaderId === userId;
          const downloadCost = document.downloadCost || settings.downloadCost;

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
            downloadCost: isOwner ? 0 : downloadCost,
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

      // Get download cost from document or system settings
      const settings = await this.systemSettings.getPointsSettings();
      const effectiveDownloadCost =
        document.downloadCost ?? settings.downloadCost;

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
        // For downloaders: show effective cost (0 for owner, actual for others)
        downloadCost: isOwner ? 0 : effectiveDownloadCost,
        // For owner: show the raw value from document (null = system default)
        // This allows owner to see and edit the custom cost setting
        ...(isOwner && {
          originalDownloadCost: document.downloadCost, // null = system default, number = custom
          systemDefaultDownloadCost: settings.downloadCost, // For reference
        }),
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
    apiKey?: string,
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
      let shareAccessGranted = false;
      if (apiKey) {
        try {
          const link = await this.validateShareLink(documentId, apiKey);
          if (
            link &&
            !link.isRevoked &&
            link.expiresAt.getTime() > Date.now()
          ) {
            shareAccessGranted = true;
          }
        } catch {
          // ignore invalid apiKey here; access checks below will handle
        }
      }

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

      // Points deduction logic for non-owner downloads
      if (userId && !isOwner) {
        // Determine if user is admin
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: { select: { name: true } } },
        });
        const isAdmin = user?.role?.name === 'admin';
        const bypass = Boolean(isAdmin || shareAccessGranted);
        try {
          await this.pointsService.spendOnDownload({
            userId,
            document: { ...(document as any) },
            performedById: isAdmin ? userId : undefined,
            bypass,
          });
        } catch (e) {
          if (!bypass) {
            throw e;
          }
        }
      }

      // NOTE: Download count is NOT incremented here anymore.
      // Instead, the frontend should call trackDownload() after the download completes successfully.
      // This prevents counting downloads that were cancelled or failed.
      // The download record and count increment will happen in trackDownload() method.

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
   * Initialize a download - creates a pending download record (success=false)
   * Called by frontend BEFORE starting the actual download.
   * Returns a downloadId that must be used to confirm the download later.
   *
   * Flow:
   * 1. Validate document exists and user has permission
   * 2. Check if user has already downloaded this document successfully
   * 3. Create pending download record (success=false)
   * 4. Return downloadId for confirmation
   *
   * Note: Points are NOT deducted here. Points will be deducted in confirmDownload()
   * AFTER the file is actually downloaded successfully. This prevents charging
   * users for cancelled/failed downloads.
   *
   * Note: Download count is NOT incremented here. It will be incremented
   * only when confirmDownload is called with the downloadId.
   */
  async initDownload(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<{ downloadId: string; alreadyDownloaded: boolean }> {
    try {
      this.logger.log(
        `Initializing download for document ${documentId} by user ${userId || 'guest'}`,
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
          downloadCost: true,
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

      // Check if user already has a successful download for this document
      let hasExistingSuccessfulDownload = false;
      if (userId) {
        const existingDownload = await this.prisma.download.findFirst({
          where: {
            userId,
            documentId,
            success: true,
          },
        });
        hasExistingSuccessfulDownload = !!existingDownload;

        if (hasExistingSuccessfulDownload) {
          this.logger.log(
            `User ${userId} already has a successful download for document ${documentId}, will skip points deduction on confirm`,
          );
        }
      }

      // PRE-CHECK: Verify user has enough points BEFORE allowing download
      // This prevents users from downloading files they can't afford
      if (userId && !isOwner && !hasExistingSuccessfulDownload) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            pointsBalance: true,
            role: { select: { name: true } },
          },
        });
        const isAdmin = user?.role?.name === 'admin';

        if (!isAdmin) {
          // Get effective download cost
          const settings = await this.systemSettings.getPointsSettings();
          const effectiveDownloadCost =
            document.downloadCost ?? settings.downloadCost;

          if ((user?.pointsBalance ?? 0) < effectiveDownloadCost) {
            throw new BadRequestException(
              `Bạn không đủ điểm để tải xuống tài liệu này. Cần ${effectiveDownloadCost} điểm, bạn có ${user?.pointsBalance ?? 0} điểm.`,
            );
          }
        }
      }

      // NOTE: Points are NOT deducted here.
      // Points will be deducted in confirmDownload() AFTER the file is actually downloaded.
      // This prevents charging users for cancelled/failed downloads.

      // Create pending download record (success=false)
      const download = await this.prisma.download.create({
        data: {
          userId: userId || null,
          documentId,
          ipAddress,
          userAgent,
          referrer,
          success: false, // Will be set to true when confirmed
          uploaderRewarded: false,
        },
      });

      this.logger.log(
        `Created pending download record ${download.id} for document ${documentId}`,
      );

      return {
        downloadId: download.id,
        alreadyDownloaded: hasExistingSuccessfulDownload,
      };
    } catch (error) {
      this.logger.error('Error initializing download:', error);
      throw error;
    }
  }

  /**
   * Confirm a download - marks the download as successful, deducts points, and increments count
   * Called by frontend AFTER the file has been successfully fetched/downloaded.
   *
   * Flow:
   * 1. Verify download record exists and belongs to user
   * 2. Check if download is already confirmed (prevent double counting)
   * 3. Deduct points from user (only for first successful download)
   * 4. Mark download as successful
   * 5. Increment download count (only for first successful download per user)
   * 6. Award points to uploader
   * 7. Emit notification
   */
  async confirmDownload(
    downloadId: string,
    userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        `Confirming download ${downloadId} for user ${userId || 'guest'}`,
      );

      // Find the download record
      const download = await this.prisma.download.findUnique({
        where: { id: downloadId },
        include: {
          document: {
            select: {
              id: true,
              uploaderId: true,
              downloadCost: true,
            },
          },
        },
      });

      if (!download) {
        throw new BadRequestException('Không tìm thấy bản ghi tải xuống');
      }

      // Verify the download belongs to the user (or is a guest download)
      if (download.userId && download.userId !== userId) {
        throw new BadRequestException(
          'Bạn không có quyền xác nhận tải xuống này',
        );
      }

      // Check if already confirmed
      if (download.success) {
        this.logger.log(`Download ${downloadId} already confirmed, skipping`);
        return {
          success: true,
          message: 'Tải xuống đã được xác nhận trước đó',
        };
      }

      const documentId = download.documentId;
      const isOwner = download.document.uploaderId === userId;

      // Check if user has other successful downloads for this document
      let hasOtherSuccessfulDownload = false;
      if (userId) {
        const otherDownload = await this.prisma.download.findFirst({
          where: {
            userId,
            documentId,
            success: true,
            id: { not: downloadId }, // Exclude current download
          },
        });
        hasOtherSuccessfulDownload = !!otherDownload;
      }

      // Deduct points for non-owner first-time downloads
      // Points are deducted HERE (in confirmDownload) instead of initDownload
      // This ensures users are only charged when download actually completes
      if (userId && !isOwner && !hasOtherSuccessfulDownload) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: { select: { name: true } } },
        });
        const isAdmin = user?.role?.name === 'admin';

        if (!isAdmin) {
          try {
            await this.pointsService.spendOnDownload({
              userId,
              document: { ...(download.document as any) },
              performedById: undefined,
              bypass: false,
            });
            this.logger.log(
              `Deducted points from user ${userId} for download ${downloadId}`,
            );
          } catch (e) {
            this.logger.error(
              `Failed to deduct points for download ${downloadId}: ${e.message}`,
            );
            throw e; // Re-throw points error to prevent confirming download
          }
        }
      }

      // Update download record and increment count in transaction
      await this.prisma.$transaction(async prisma => {
        // Mark download as successful
        await prisma.download.update({
          where: { id: downloadId },
          data: { success: true },
        });

        // Only increment download count if:
        // 1. This is NOT the owner (owner downloads don't count)
        // 2. This is the first successful download for this user
        if (!isOwner && !hasOtherSuccessfulDownload) {
          await prisma.document.update({
            where: { id: documentId },
            data: {
              downloadCount: { increment: 1 },
            },
          });
        }
      });

      // Award uploader points (if not owner and this is first successful download)
      if (userId && !isOwner && !hasOtherSuccessfulDownload) {
        try {
          let effectiveDownloadCost = download.document.downloadCost;
          if (
            effectiveDownloadCost === null ||
            effectiveDownloadCost === undefined
          ) {
            const settings = await this.systemSettings.getPointsSettings();
            effectiveDownloadCost = settings.downloadCost;
          }

          await this.pointsService.awardUploaderOnDownload(
            download.document.uploaderId,
            documentId,
            userId,
            downloadId,
            effectiveDownloadCost,
          );
          this.logger.log(
            `Awarded uploader ${download.document.uploaderId} for download ${downloadId}`,
          );
        } catch (awardError) {
          this.logger.error(
            `Failed to award uploader for download ${downloadId}: ${awardError.message}`,
          );
        }
      }

      // Emit realtime notification (only if count was incremented - not for owner or re-downloads)
      if (!isOwner && !hasOtherSuccessfulDownload) {
        this.notifications.emitToUploaderOfDocument(
          download.document.uploaderId,
          {
            type: 'download',
            documentId,
            userId,
            count: 1,
          },
        );
      }

      this.logger.log(
        `Successfully confirmed download ${downloadId}${isOwner ? ' (owner download, count not incremented)' : hasOtherSuccessfulDownload ? ' (re-download, count not incremented)' : ''}`,
      );

      return {
        success: true,
        message: hasOtherSuccessfulDownload
          ? 'Tải xuống đã được xác nhận (tải lại)'
          : 'Tải xuống đã được xác nhận thành công',
      };
    } catch (error) {
      this.logger.error('Error confirming download:', error);
      throw error;
    }
  }

  /**
   * Cancel/cleanup a pending download - called when download fails or is cancelled
   * This allows refunding points if needed
   */
  async cancelDownload(
    downloadId: string,
    userId?: string,
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(
        `Cancelling download ${downloadId} for user ${userId || 'guest'}`,
      );

      const download = await this.prisma.download.findUnique({
        where: { id: downloadId },
      });

      if (!download) {
        // Download not found, maybe already cleaned up
        return { success: true };
      }

      // Verify ownership
      if (download.userId && download.userId !== userId) {
        throw new BadRequestException('Bạn không có quyền hủy tải xuống này');
      }

      // Only allow cancelling pending downloads
      if (download.success) {
        this.logger.log(
          `Download ${downloadId} already successful, cannot cancel`,
        );
        return { success: false };
      }

      // Mark as failed (keep record for audit)
      await this.prisma.download.update({
        where: { id: downloadId },
        data: { success: false },
      });

      // TODO: Implement point refund logic if needed
      // For now, points are not refunded on cancellation

      this.logger.log(`Download ${downloadId} cancelled`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error cancelling download:', error);
      throw error;
    }
  }

  /**
   * Prepare streaming download - validates permissions, checks points, creates pending download record
   * Returns necessary data for streaming and callback functions for success/failure
   *
   * Flow:
   * 1. Validate document exists and user has permission
   * 2. Check if user has already downloaded this document successfully (skip points deduction if yes)
   * 3. Deduct points from downloader (if applicable)
   * 4. Create pending download record (success=false)
   * 5. Return file stream data and callbacks for onFinish/onError
   */
  async prepareStreamingDownload(
    documentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
    apiKey?: string,
  ): Promise<{
    fileStream: Readable;
    fileName: string;
    mimeType: string;
    fileSize: number;
    downloadId: string;
    uploaderId: string;
    onStreamComplete: () => Promise<void>;
    onStreamError: () => Promise<void>;
  }> {
    try {
      this.logger.log(
        `Preparing streaming download for document ${documentId} by user ${userId}`,
      );

      // Get document with files and downloadCost for reward calculation
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          title: true,
          uploaderId: true,
          isPublic: true,
          isApproved: true,
          moderationStatus: true,
          downloadCost: true, // Include for uploader reward calculation
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
      let shareAccessGranted = false;

      if (apiKey) {
        try {
          const link = await this.validateShareLink(documentId, apiKey);
          if (
            link &&
            !link.isRevoked &&
            link.expiresAt.getTime() > Date.now()
          ) {
            shareAccessGranted = true;
          }
        } catch {
          // ignore invalid apiKey
        }
      }

      // Check access permissions
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
        if (!isOwner && !shareAccessGranted) {
          throw new BadRequestException(
            'Bạn không có quyền tải xuống tài liệu này',
          );
        }
      }

      if (!document.files || document.files.length === 0) {
        throw new BadRequestException('Tài liệu không có tệp để tải xuống');
      }

      // Check if user has already successfully downloaded this document
      const hasExistingSuccessfulDownload =
        await this.pointsService.hasSuccessfulDownload(userId, documentId);

      // Points deduction logic for non-owner downloads (only if not already downloaded)
      if (!isOwner && !hasExistingSuccessfulDownload) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: { select: { name: true } } },
        });
        const isAdmin = user?.role?.name === 'admin';
        const bypass = Boolean(isAdmin || shareAccessGranted);

        try {
          await this.pointsService.spendOnDownload({
            userId,
            document: { ...(document as any) },
            performedById: isAdmin ? userId : undefined,
            bypass,
          });
        } catch (e) {
          if (!bypass) {
            throw e;
          }
        }
      } else if (hasExistingSuccessfulDownload) {
        this.logger.log(
          `User ${userId} has already downloaded document ${documentId}, skipping points deduction`,
        );
      }

      // Create pending download record
      const download = await this.prisma.download.create({
        data: {
          userId,
          documentId,
          ipAddress,
          userAgent,
          referrer,
          success: false, // Will be set to true on res.finish
          uploaderRewarded: false,
        },
      });

      // Get the file to stream (single file only for now - ZIP streaming requires different approach)
      if (document.files.length > 1) {
        // For multiple files, fall back to ZIP download (existing behavior)
        // Clean up the download record we just created
        await this.prisma.download.delete({ where: { id: download.id } });
        throw new BadRequestException(
          'Streaming download chỉ hỗ trợ tài liệu đơn tệp. Sử dụng endpoint download thông thường cho tài liệu nhiều tệp.',
        );
      }

      const file = document.files[0].file;
      const fileStream = await this.r2Service.getFileStream(file.storageUrl);

      const uploaderId = document.uploaderId;
      const downloadId = download.id;

      // Callback for when stream completes successfully (res.finish)
      const onStreamComplete = async () => {
        try {
          this.logger.log(
            `Stream completed for download ${downloadId}, marking as successful`,
          );

          // Update download count
          await this.prisma.document.update({
            where: { id: documentId },
            data: {
              downloadCount: { increment: 1 },
            },
          });

          // Award uploader (handles duplicate check internally)
          // Pass effective downloadCost so uploader receives same amount as downloader paid
          // We already have document.downloadCost from the initial query
          let effectiveDownloadCost = document.downloadCost;
          if (
            effectiveDownloadCost === null ||
            effectiveDownloadCost === undefined
          ) {
            const settings = await this.systemSettings.getPointsSettings();
            effectiveDownloadCost = settings.downloadCost;
          }
          await this.pointsService.awardUploaderOnDownload(
            uploaderId,
            documentId,
            userId,
            downloadId,
            effectiveDownloadCost,
          );

          // Emit realtime download event to uploader
          this.notifications.emitToUploaderOfDocument(uploaderId, {
            type: 'download',
            documentId,
            userId,
            count: 1,
          });

          this.logger.log(
            `Download ${downloadId} marked as successful, uploader rewarded`,
          );
        } catch (error) {
          this.logger.error(
            `Error in onStreamComplete for download ${downloadId}: ${error.message}`,
          );
        }
      };

      // Callback for when stream fails or is aborted
      const onStreamError = async () => {
        try {
          this.logger.log(
            `Stream failed/aborted for download ${downloadId}, cleaning up`,
          );

          // Mark download as failed (don't delete to keep audit trail)
          await this.prisma.download.update({
            where: { id: downloadId },
            data: { success: false },
          });

          // Note: We don't refund points here because points were deducted before streaming started
          // This is a design decision - if user wants refund for failed downloads,
          // we'd need a different approach (deduct after success)
        } catch (error) {
          this.logger.error(
            `Error in onStreamError for download ${downloadId}: ${error.message}`,
          );
        }
      };

      return {
        fileStream,
        fileName: file.originalName,
        mimeType: file.mimeType,
        fileSize: Number(file.fileSize),
        downloadId,
        uploaderId,
        onStreamComplete,
        onStreamError,
      };
    } catch (error) {
      this.logger.error(
        `Error preparing streaming download for document ${documentId}: ${error.message}`,
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
   * Search documents using vector search
   */
  async searchDocuments(
    query: string,
    page: number = 1,
    limit: number = 10,
    userId?: string,
    userRole?: string,
    filters?: {
      categoryId?: string;
      tags?: string[];
      language?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    try {
      const normalizedQuery = query.trim();
      const skip = (page - 1) * limit;
      const searchStrategy: 'hybrid' = 'hybrid';

      this.logger.log(
        `Searching documents: "${normalizedQuery.substring(0, 50)}..." (method: ${searchStrategy})`,
      );

      const fetchLimit = Math.max(limit, Math.min(limit * (page + 1), 100));

      const vectorFilters: {
        categoryId?: string;
        tags?: string[];
        language?: string;
        isPublic?: boolean;
        isApproved?: boolean;
      } = {
        categoryId: filters?.categoryId,
        tags: filters?.tags,
        language: filters?.language,
        isApproved: true,
      };

      if (userRole !== 'admin') {
        vectorFilters.isPublic = true;
      }

      let searchResults: HybridSearchResult[] =
        await this.vectorSearchService.hybridSearch({
          query: normalizedQuery,
          userId,
          userRole,
          limit: fetchLimit,
          threshold: 0.4,
          filters: vectorFilters,
        });

      if (searchResults.length === 0) {
        this.logger.warn(
          'Hybrid search returned no results; falling back to keyword search.',
        );

        const fallbackResults = await this.vectorSearchService.keywordSearch({
          query: normalizedQuery,
          limit: fetchLimit,
          filters: vectorFilters,
        });

        searchResults = fallbackResults.map(result => ({
          documentId: result.documentId,
          textScore: result.textScore,
          combinedScore: result.textScore,
        }));
      }

      const documentIds = searchResults
        .slice(skip, skip + limit)
        .map(result => result.documentId);

      if (documentIds.length === 0) {
        return {
          documents: [],
          total: searchResults.length,
          page,
          limit,
          searchMethod: searchStrategy,
        };
      }

      const documentWhere: Prisma.DocumentWhereInput = {
        id: {
          in: documentIds,
        },
        isApproved: true,
        moderationStatus: DocumentModerationStatus.APPROVED,
      };

      if (userRole !== 'admin') {
        documentWhere.isPublic = true;
      }

      if (filters?.categoryId) {
        documentWhere.categoryId = filters.categoryId;
      }

      if (filters?.language) {
        documentWhere.language = filters.language;
      }

      if (filters?.tags && filters.tags.length > 0) {
        documentWhere.tags = {
          hasSome: filters.tags,
        };
      }

      const documents = await this.prisma.document.findMany({
        where: documentWhere,
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
      });

      const orderedDocuments = documentIds
        .map(id => documents.find(doc => doc.id === id))
        .filter((doc): doc is (typeof documents)[number] => doc !== undefined);

      const settings = await this.systemSettings.getPointsSettings();

      const transformedDocuments = await Promise.all(
        orderedDocuments.map(async document => {
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

          const isOwner = document.uploaderId === userId;
          const downloadCost = document.downloadCost || settings.downloadCost;

          const searchResult = searchResults.find(
            r => r.documentId === document.id,
          );
          const similarityScore = searchResult?.combinedScore;

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
            downloadCost: isOwner ? 0 : downloadCost,
            viewCount: document.viewCount,
            averageRating: document.averageRating,
            files: filesWithSecureUrls,
            similarityScore,
          };
        }),
      );

      return {
        documents: transformedDocuments,
        total: searchResults.length,
        page,
        limit,
        searchMethod: searchStrategy,
      };
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw new InternalServerErrorException('Không thể tìm kiếm tài liệu');
    }
  }

  /**
   * Generate and save document embedding for vector search
   */
  private async generateDocumentEmbedding(documentId: string): Promise<void> {
    try {
      this.logger.log(`Generating embedding for document ${documentId}`);

      // Get document with files and AI analysis
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: {
              file: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          aiAnalysis: true,
        },
      });

      if (!document) {
        this.logger.warn(
          `Document ${documentId} not found for embedding generation`,
        );
        return;
      }

      // Build text content for embedding
      // Priority: AI analysis summary > description > title + tags
      let textContent = '';

      if (document.aiAnalysis?.summary) {
        textContent = document.aiAnalysis.summary;
      } else if (document.description) {
        textContent = document.description;
      } else {
        textContent = `${document.title} ${document.tags.join(' ')}`;
      }

      // Add title and tags for better context
      textContent = `${document.title} ${textContent} ${document.tags.join(' ')}`;

      if (!textContent || textContent.trim().length === 0) {
        this.logger.warn(
          `No text content available for embedding document ${documentId}`,
        );
        return;
      }

      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(
        textContent.trim(),
      );

      // Save embedding to database
      await this.prisma.documentEmbedding.upsert({
        where: { documentId },
        update: {
          embedding,
          updatedAt: new Date(),
        },
        create: {
          documentId,
          embedding,
        },
      });

      this.logger.log(
        `Embedding generated and saved for document ${documentId} (dimension: ${embedding.length})`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating embedding for document ${documentId}:`,
        error.message,
      );
      // Don't throw - embedding generation is not critical for document creation
    }
  }

  /**
   * Update a document (only by owner or admin)
   */
  async updateDocument(
    documentId: string,
    userId: string,
    updateData: {
      title?: string;
      description?: string;
      categoryId?: string;
      isPublic?: boolean;
      tags?: string[];
      language?: string;
      downloadCost?: number | null;
    },
    userRole?: string,
  ) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          uploaderId: true,
          isPublic: true,
          moderationStatus: true,
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const isOwner = document.uploaderId === userId;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isAdmin) {
        throw new BadRequestException(
          'Bạn không có quyền chỉnh sửa tài liệu này',
        );
      }

      // Build update data
      const dataToUpdate: any = {};

      if (updateData.title !== undefined) {
        dataToUpdate.title = updateData.title;
      }

      if (updateData.description !== undefined) {
        dataToUpdate.description = updateData.description;
      }

      if (updateData.categoryId !== undefined) {
        // Verify category exists
        const category = await this.prisma.category.findUnique({
          where: { id: updateData.categoryId },
        });
        if (!category) {
          throw new BadRequestException('Không tìm thấy danh mục');
        }
        dataToUpdate.categoryId = updateData.categoryId;
      }

      if (updateData.tags !== undefined) {
        dataToUpdate.tags = updateData.tags;
      }

      if (updateData.language !== undefined) {
        dataToUpdate.language = updateData.language;
      }

      // Handle downloadCost - null means use system default
      if (updateData.downloadCost !== undefined) {
        dataToUpdate.downloadCost = updateData.downloadCost;
      }

      // Handle isPublic change - may need re-moderation
      if (updateData.isPublic !== undefined) {
        const wasPublic = document.isPublic;
        const wantsPublic = updateData.isPublic;

        if (!wasPublic && wantsPublic) {
          // Switching from private to public - needs moderation
          dataToUpdate.isPublic = true;
          dataToUpdate.isApproved = false;
          dataToUpdate.moderationStatus = DocumentModerationStatus.PENDING;
        } else if (wasPublic && !wantsPublic) {
          // Switching from public to private
          dataToUpdate.isPublic = false;
          dataToUpdate.isApproved = true;
        }
      }

      const updatedDocument = await this.prisma.document.update({
        where: { id: documentId },
        data: dataToUpdate,
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
          files: {
            include: {
              file: true,
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      this.logger.log(`Document ${documentId} updated by user ${userId}`);

      // Get system default for reference
      const settings = await this.systemSettings.getPointsSettings();

      return {
        id: updatedDocument.id,
        title: updatedDocument.title,
        description: updatedDocument.description,
        isPublic: updatedDocument.isPublic,
        isApproved: updatedDocument.isApproved,
        moderationStatus: updatedDocument.moderationStatus,
        tags: updatedDocument.tags,
        language: updatedDocument.language,
        downloadCost: 0, // Owner downloads are free
        originalDownloadCost: updatedDocument.downloadCost, // Raw value (null = system default)
        systemDefaultDownloadCost: settings.downloadCost, // For reference
        createdAt: updatedDocument.createdAt,
        updatedAt: updatedDocument.updatedAt,
        uploader: updatedDocument.uploader,
        category: updatedDocument.category,
        files: updatedDocument.files.map(df => ({
          id: df.file.id,
          originalName: df.file.originalName,
          fileName: df.file.fileName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          order: df.order,
        })),
      };
    } catch (error) {
      this.logger.error(`Error updating document ${documentId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể cập nhật tài liệu');
    }
  }

  /**
   * Get effective download cost for a document (from document or system default)
   */
  async getEffectiveDownloadCost(documentId: string): Promise<number> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { downloadCost: true },
    });

    if (
      document?.downloadCost !== null &&
      document?.downloadCost !== undefined
    ) {
      return document.downloadCost;
    }

    const settings = await this.systemSettings.getPointsSettings();
    return settings.downloadCost;
  }
}
