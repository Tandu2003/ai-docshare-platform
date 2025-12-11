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
import { EmbeddingStorageService } from '../common/services/embedding-storage.service';
import { EmbeddingTextBuilderService } from '../common/services/embedding-text-builder.service';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesService } from '../files/files.service';
import { PreviewQueueService } from '../preview/preview-queue.service';
import { PreviewService } from '../preview/preview.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  DocumentCommentService,
  DocumentCrudService,
  DocumentDownloadService,
  DocumentModerationService,
  DocumentQueryService,
  DocumentSearchService,
  DocumentSharingService,
} from './services';
import { NotificationsService } from '@/notifications/notifications.service';
import { PointsService } from '@/points/points.service';
import { SimilarityJobService } from '@/similarity/similarity-job.service';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentModerationStatus,
  DocumentShareLink,
  Prisma,
} from '@prisma/client';
import archiver from 'archiver';

@Injectable()
export class DocumentsService {
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
    @Inject(forwardRef(() => PreviewService))
    private previewService: PreviewService,
    @Inject(forwardRef(() => PreviewQueueService))
    private previewQueueService: PreviewQueueService,
    // Domain services
    private commentService: DocumentCommentService,
    private crudService: DocumentCrudService,
    private downloadService: DocumentDownloadService,
    private moderationService: DocumentModerationService,
    private queryService: DocumentQueryService,
    private searchService: DocumentSearchService,
    private sharingService: DocumentSharingService,
    private embeddingTextBuilder: EmbeddingTextBuilderService,
    private embeddingStorage: EmbeddingStorageService,
  ) {}

  async createDocument(
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    uploaderId: string;
    categoryId: string;
    isPublic: boolean;
    isApproved: boolean;
    moderationStatus: DocumentModerationStatus;
    tags: string[];
    language: string;
    downloadCost: number | null;
    createdAt: Date;
    updatedAt: Date;
    uploader: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
    };
    category: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
      parentId: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    files: Array<{
      id: string;
      originalName: string;
      fileName: string;
      mimeType: string;
      fileSize: bigint;
      storageUrl: string;
      uploaderId: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    aiSuggestedCategory: {
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
    } | null;
  }> {
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

      // Validate that all files exist and belong to the user
      const files = await this.prisma.file.findMany({
        where: { id: { in: fileIds }, uploaderId: userId },
      });

      if (files.length !== fileIds.length) {
        throw new BadRequestException(
          'Một số tệp không tìm thấy hoặc không thuộc về người dùng',
        );
      }

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
          }
        } catch {
          // Failed to get AI category suggestion
        }
      }

      // Get or create default category if still not determined
      const category = finalCategoryId
        ? await this.prisma.category.findUnique({
            where: { id: finalCategoryId },
          })
        : await this.getOrCreateDefaultCategory();

      if (!category) {
        throw new BadRequestException('Không tìm thấy danh mục');
      }

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

      // Create DocumentFile relationships (required synchronously for response)
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

      // Run background tasks asynchronously - don't make user wait
      void this.runPostCreationTasks(
        document,
        userId,
        fileIds,
        files,
        wantsPublic,
        useAI,
        aiAnalysis,
        categoryId,
        category,
        suggestedCategory,
        title,
        description,
        tags,
      );

      // Return document with files immediately
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

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new Error('Unexpected error');
      }
      throw new InternalServerErrorException('Đã xảy ra lỗi khi tạo tài liệu');
    }
  }

  private async runPostCreationTasks(
    document: any,
    userId: string,
    fileIds: string[],
    files: any[],
    wantsPublic: boolean,
    useAI: boolean,
    aiAnalysis: any,
    categoryId: string | undefined,
    category: any,
    suggestedCategory: any,
    title: string,
    description?: string,
    tags: string[] = [],
  ): Promise<void> {
    try {
      // Award points for uploading a document
      try {
        await this.pointsService.awardOnUpload(userId, document.id);
      } catch {
        // Failed to award points for upload
      }

      // Save AI analysis if provided
      if (
        useAI &&
        aiAnalysis &&
        aiAnalysis.confidence &&
        aiAnalysis.confidence > 0
      ) {
        await this.processProvidedAIAnalysis(document, aiAnalysis, wantsPublic);
      }

      // Automatically trigger AI analysis for public documents when not provided
      if (wantsPublic && (!useAI || !aiAnalysis)) {
        await this.processAutoAIAnalysis(
          document,
          fileIds,
          userId,
          categoryId,
          category,
          suggestedCategory,
          title,
          description,
          tags,
        );
      }

      // Generate document embedding for vector search
      // Only for approved/public documents to enable vector search
      if (document.isApproved && wantsPublic) {
        try {
          await this.generateDocumentEmbedding(document.id);
        } catch {
          // Failed to generate embedding
        }
      }

      // Queue preview generation (non-blocking)
      this.previewQueueService.enqueue(document.id);
    } catch {
      // Error in background tasks
    }
  }

  private async processProvidedAIAnalysis(
    document: any,
    aiAnalysis: any,
    wantsPublic: boolean,
  ): Promise<void> {
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

      // When AI analysis is provided, run similarity detection and apply moderation
      if (wantsPublic) {
        try {
          this.similarityJobService.runSimilarityDetectionSync(document.id);
        } catch {
          // Similarity detection failed
        }

        // Apply AI moderation
        await this.applyAIModeration(document, aiAnalysis.confidence || 50);
      }
    } catch {
      // Failed to save AI analysis
    }
  }

  private async processAutoAIAnalysis(
    document: any,
    fileIds: string[],
    userId: string,
    categoryId: string | undefined,
    category: any,
    suggestedCategory: any,
    title: string,
    description?: string,
    tags: string[] = [],
  ): Promise<void> {
    try {
      const aiResult = await this.aiService.analyzeDocuments({
        fileIds,
        userId,
      });

      if (aiResult.success && aiResult.data) {
        await this.aiService.saveAnalysis(document.id, aiResult.data);

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
            }
          } catch {
            // Failed to suggest category
          }
        }

        // Run similarity detection
        try {
          this.similarityJobService.runSimilarityDetectionSync(document.id);
        } catch {
          // Similarity detection failed
        }

        // Apply AI moderation
        const moderationScore = aiResult.data.moderationScore || 50;
        await this.applyAIModeration(document, moderationScore);
      }
    } catch {
      // Unable to generate AI analysis automatically
    }
  }

  private async applyAIModeration(
    document: any,
    moderationScore: number,
  ): Promise<void> {
    try {
      const moderationResult = await this.aiService.applyModerationSettings(
        document.id,
        moderationScore,
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
              moderationResult.status === 'approved' ? 'APPROVED' : 'REJECTED',
            isApproved,
            moderatedAt,
            moderationNotes,
          },
        });

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
        } catch {
          // Failed to send moderation notification
        }
      }
    } catch {
      // Failed to apply AI moderation
    }
  }

  async getComments(documentId: string, userId?: string): Promise<any[]> {
    return this.commentService.getComments(documentId, userId);
  }

  async addComment(
    documentId: string,
    userId: string,
    dto: { content: string; parentId?: string },
  ): Promise<any> {
    return this.commentService.addComment(documentId, userId, dto);
  }

  async likeComment(
    documentId: string,
    commentId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    return this.commentService.likeComment(documentId, commentId, userId);
  }

  async editComment(
    documentId: string,
    commentId: string,
    userId: string,
    dto: { content: string },
  ): Promise<{ id: string; content: string; isEdited: boolean }> {
    return this.commentService.editComment(documentId, commentId, userId, dto);
  }

  async deleteComment(
    documentId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    return this.commentService.deleteComment(documentId, commentId, userId);
  }

  async getUserRating(
    documentId: string,
    userId: string,
  ): Promise<{ rating: number }> {
    return this.commentService.getUserRating(documentId, userId);
  }

  async setUserRating(
    documentId: string,
    userId: string,
    ratingValue: number,
  ): Promise<{ rating: number }> {
    return this.commentService.setUserRating(documentId, userId, ratingValue);
  }

  async prepareDocumentDownload(documentId: string): Promise<any> {
    return this.downloadService.prepareDocumentDownload(documentId);
  }

  private async getOrCreateDefaultCategory(): Promise<any> {
    return this.crudService.getOrCreateDefaultCategory();
  }

  async getUserDocuments(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    return this.queryService.getUserDocuments(userId, page, limit);
  }

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
  ): Promise<any> {
    return this.queryService.getPublicDocuments(
      page,
      limit,
      userId,
      userRole,
      filters,
    );
  }

  async viewDocument(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<any> {
    return this.queryService.viewDocument(
      documentId,
      userId,
      ipAddress,
      userAgent,
      referrer,
    );
  }

  async getDocumentById(
    documentId: string,
    userId?: string,
    shareToken?: string,
    apiKey?: string,
  ): Promise<any> {
    return this.queryService.getDocumentById(
      documentId,
      userId,
      shareToken,
      apiKey,
    );
  }

  async createOrUpdateShareLink(
    documentId: string,
    userId: string,
    shareOptions: ShareDocumentDto,
  ): Promise<any> {
    return this.sharingService.createOrUpdateShareLink(documentId, userId, {
      expiresAt: shareOptions.expiresAt,
      expiresInMinutes: shareOptions.expiresInMinutes,
      regenerateToken: shareOptions.regenerateToken,
    });
  }

  async revokeShareLink(
    documentId: string,
    userId: string,
  ): Promise<{ success: boolean; message?: string }> {
    return this.sharingService.revokeShareLink(documentId, userId);
  }

  async validateShareLink(
    documentId: string,
    token: string,
  ): Promise<DocumentShareLink | null> {
    return this.sharingService.validateShareLink(
      documentId,
      token,
    ) as Promise<DocumentShareLink | null>;
  }

  private generateShareToken(): string {
    return randomBytes(24).toString('hex');
  }

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
      // Check if ZIP file already exists and is still valid
      if (document.zipFileUrl) {
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
      if (error instanceof BadRequestException) {
        throw new Error('Unexpected error');
      }
      throw new InternalServerErrorException(
        'Không thể chuẩn bị tải xuống tài liệu',
      );
    }
  }

  async getModerationQueue(options: {
    page?: number;
    limit?: number;
    categoryId?: string;
    uploaderId?: string;
    status?: DocumentModerationStatus;
    sort?: 'createdAt' | 'title' | 'uploader';
    order?: 'asc' | 'desc';
  }): Promise<{
    summary: {
      pendingDocuments: number;
      rejectedDocuments: number;
      approvedToday: number;
    };
    documents: Array<{
      id: string;
      title: string;
      description: string | null;
      isPublic: boolean;
      isApproved: boolean;
      moderationStatus: DocumentModerationStatus;
      moderatedAt: string | null;
      moderatedById: string | null;
      moderationNotes: string | null;
      rejectionReason: string | null;
      tags: string[];
      language: string;
      createdAt: string;
      updatedAt: string;
      category: { id: string; name: string } | null;
      uploader: {
        id: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        email: string;
        isVerified: boolean;
      };
      aiAnalysis: {
        summary: string | null;
        keyPoints: string[];
        difficulty: string;
        confidence: number;
        reliabilityScore: number;
        moderationScore: number;
        safetyFlags: string[];
        isSafe: boolean;
        recommendedAction: string;
      } | null;
      files: Array<{
        id: string;
        originalName: string;
        mimeType: string;
        fileSize: bigint;
        order: number;
        thumbnailUrl: string | null;
      }>;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    return this.moderationService.getModerationQueue(options);
  }

  async getDocumentForModeration(documentId: string): Promise<{
    id: string;
    title: string;
    description: string | null;
    uploaderId: string;
    categoryId: string;
    isPublic: boolean;
    isApproved: boolean;
    moderationStatus: DocumentModerationStatus;
    tags: string[];
    language: string;
    downloadCost: number | null;
    createdAt: Date;
    updatedAt: Date;
    moderatedAt: Date | null;
    moderationNotes: string | null;
    uploader: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
    };
    category: {
      id: string;
      name: string;
    } | null;
    files: Array<{
      id: string;
      originalName: string;
      fileName: string;
      mimeType: string;
      fileSize: bigint;
    }>;
  }> {
    return this.moderationService.getDocumentForModeration(documentId);
  }

  async approveDocumentModeration(
    documentId: string,
    adminId: string,
    options: { notes?: string; publish?: boolean } = {},
  ): Promise<{
    id: string;
    title: string;
    isApproved: boolean;
    moderationStatus: DocumentModerationStatus;
    moderatedAt: Date | null;
    moderationNotes: string | null;
  }> {
    return this.moderationService.approveDocument(documentId, adminId, options);
  }

  async rejectDocumentModeration(
    documentId: string,
    adminId: string,
    options: { reason: string; notes?: string },
  ): Promise<{
    id: string;
    title: string;
    isApproved: boolean;
    moderationStatus: DocumentModerationStatus;
    moderatedAt: Date | null;
    moderationNotes: string | null;
  }> {
    return this.moderationService.rejectDocument(documentId, adminId, options);
  }

  async checkAutoModeration(documentId: string): Promise<{
    shouldAutoApprove: boolean;
    shouldAutoReject: boolean;
    reason?: string;
  }> {
    return this.moderationService.checkAutoModeration(documentId);
  }

  async generateModerationAnalysis(documentId: string): Promise<{
    success: boolean;
    analysis: null;
    processedFiles: number;
    processingTime: number;
    autoModeration: { action: string; reason: string } | null;
  }> {
    return this.moderationService.generateModerationAnalysis(documentId);
  }

  async deleteDocument(
    documentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
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

      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new Error('Unexpected error');
      }
      throw new InternalServerErrorException('Không thể xóa tài liệu');
    }
  }

  private async createZipDownload(
    files: any[],
    documentId: string,
  ): Promise<string> {
    try {
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
          resolve(zipBuffer);
        });

        archive.on('error', error => {
          reject(error);
        });
      });

      // Add files to ZIP
      for (const file of files) {
        try {
          // Get file stream from R2
          const fileStream = await this.r2Service.getFileStream(
            file.storageUrl,
          );

          // Add file to archive
          archive.append(fileStream, { name: file.originalName });
        } catch {
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

      return zipUrl;
    } catch {
      throw new InternalServerErrorException('Không thể tạo tải xuống ZIP');
    }
  }

  async getDownloadUrl(
    documentId: string,
    userId?: string,
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    fileCount: number;
  }> {
    return this.downloadService.getDownloadUrl(documentId, userId);
  }

  async initDownload(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<{ downloadId: string; alreadyDownloaded: boolean }> {
    return this.downloadService.initDownload(
      documentId,
      userId,
      ipAddress,
      userAgent,
      referrer,
    );
  }

  async confirmDownload(
    downloadId: string,
    userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.downloadService.confirmDownload(downloadId, userId);
  }

  async cancelDownload(
    downloadId: string,
    userId?: string,
  ): Promise<{ success: boolean }> {
    return this.downloadService.cancelDownload(downloadId, userId);
  }

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
    return this.downloadService.prepareStreamingDownload(
      documentId,
      userId,
      ipAddress,
      userAgent,
      referrer,
      apiKey,
    );
  }

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
  ): Promise<{
    documents: Array<{
      id: string;
      title: string;
      description: string | null;
      isPublic: boolean;
      isApproved: boolean;
      moderationStatus: DocumentModerationStatus;
      tags: string[];
      language: string;
      createdAt: Date;
      updatedAt: Date;
      uploaderId: string;
      categoryId: string;
      category: {
        id: string;
        name: string;
        icon: string | null;
        color: string | null;
      } | null;
      uploader: {
        id: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
      };
      downloadCount: number;
      downloadCost: number;
      viewCount: number;
      averageRating: number | null;
      files: Array<{
        id: string;
        originalName: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        secureUrl?: string;
        secureUrlExpiresAt?: Date;
      }>;
      similarityScore?: number;
    }>;
    total: number;
    page: number;
    limit: number;
    searchMethod: string;
  }> {
    try {
      const normalizedQuery = query.trim();
      const skip = (page - 1) * limit;
      const searchStrategy = 'hybrid' as const;

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

      let searchResults: HybridSearchResult[] = [];

      try {
        searchResults = await this.vectorSearchService.hybridSearch({
          query: normalizedQuery,
          userId,
          userRole,
          limit: fetchLimit,
          threshold: 0.4,
          filters: vectorFilters,
        });
      } catch {
        // Fallback to keyword search on error
        searchResults = [];
      }

      if (searchResults.length === 0) {
        try {
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
        } catch {
          // Return empty results if both searches fail
          searchResults = [];
        }
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
    } catch {
      throw new InternalServerErrorException('Không thể tìm kiếm tài liệu');
    }
  }

  /**
   * Generate embedding for a document using unified EmbeddingTextBuilderService.
   * This ensures consistent embedding generation across search and similarity detection.
   */
  private async generateDocumentEmbedding(documentId: string): Promise<void> {
    try {
      // Get document with AI analysis (no need for files for search embedding)
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          aiAnalysis: true,
        },
      });

      if (!document) {
        return;
      }

      // Use unified embedding text builder for consistent embedding generation
      const textContent = this.embeddingTextBuilder.buildSearchEmbeddingText({
        title: document.title,
        description: document.description,
        tags: document.tags,
        aiAnalysis: document.aiAnalysis
          ? {
              summary: document.aiAnalysis.summary,
              keyPoints: document.aiAnalysis.keyPoints,
            }
          : null,
      });

      if (!textContent || textContent.trim().length === 0) {
        return;
      }

      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(
        textContent.trim(),
      );
      const model = this.embeddingService.getModelName();

      // Save embedding to database using shared service with proper vector formatting
      await this.embeddingStorage.saveEmbedding(
        documentId,
        embedding,
        model,
        '1.0',
      );
    } catch {
      // Don't throw - embedding generation is not critical for document creation
    }
  }

  async updateDocument(
    documentId: string,
    userId: string,
    updateData: UpdateDocumentDto,
    userRole?: string,
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    isApproved: boolean;
    moderationStatus: DocumentModerationStatus;
    tags: string[];
    language: string;
    downloadCost: number;
    originalDownloadCost: number | null;
    systemDefaultDownloadCost: number;
    createdAt: Date;
    updatedAt: Date;
    uploader: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
    };
    category: {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
    } | null;
    files: Array<{
      id: string;
      originalName: string;
      fileName: string;
      mimeType: string;
      fileSize: bigint;
      order: number;
    }>;
    needsReModeration: boolean;
  }> {
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
      let needsReModeration = false;

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

      // Handle files edited flag - triggers re-moderation
      if (updateData.filesEdited) {
        needsReModeration = true;
        dataToUpdate.moderationStatus = DocumentModerationStatus.PENDING;
        dataToUpdate.isApproved = false;
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
          needsReModeration = true;
        } else if (wasPublic && !wantsPublic) {
          // Switching from public to private
          dataToUpdate.isPublic = false;
          if (!needsReModeration) {
            dataToUpdate.isApproved = true;
          }
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
        needsReModeration: needsReModeration,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new Error('Unexpected error');
      }
      throw new InternalServerErrorException('Không thể cập nhật tài liệu');
    }
  }

  async getEffectiveDownloadCost(documentId: string): Promise<number> {
    return this.downloadService.getEffectiveDownloadCost(documentId);
  }
}
