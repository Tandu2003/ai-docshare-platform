/**
 * @fileoverview Document CRUD Service
 * @description Handles core document CRUD operations
 * @module documents/services/document-crud
 */

import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentSearchService } from './document-search.service';
import { AIService } from '@/ai/ai.service';
import { CategoriesService } from '@/categories/categories.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PointsService } from '@/points/points.service';
import { PreviewService } from '@/preview/preview.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SimilarityJobService } from '@/similarity/similarity-job.service';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DocumentModerationStatus } from '@prisma/client';

/** Category suggestion result */
interface CategorySuggestion {
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly confidence: number;
  readonly allSuggestions: Array<{
    readonly id: string;
    readonly name: string;
    readonly icon: string | null;
    readonly color: string | null;
    readonly parentId: string | null;
    readonly score: number;
    readonly confidence: number;
  }>;
}

/** Created document response */
interface CreateDocumentResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublic: boolean;
  readonly isApproved: boolean;
  readonly moderationStatus: DocumentModerationStatus;
  readonly tags: string[];
  readonly language: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly uploader: {
    readonly id: string;
    readonly username: string;
    readonly firstName: string | null;
    readonly lastName: string | null;
  };
  readonly category: any;
  readonly files: any[];
  readonly aiSuggestedCategory: CategorySuggestion | null;
}

/** Updated document response */
interface UpdateDocumentResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublic: boolean;
  readonly isApproved: boolean;
  readonly moderationStatus: DocumentModerationStatus;
  readonly tags: string[];
  readonly language: string;
  readonly downloadCost: number;
  readonly originalDownloadCost: number | null;
  readonly systemDefaultDownloadCost: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly uploader: any;
  readonly category: any;
  readonly files: any[];
  readonly needsReModeration: boolean;
}

@Injectable()
export class DocumentCrudService {
  private readonly logger = new Logger(DocumentCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly systemSettings: SystemSettingsService,
    private readonly notifications: NotificationsService,
    private readonly pointsService: PointsService,
    private readonly categoriesService: CategoriesService,
    private readonly similarityJobService: SimilarityJobService,
    @Inject(forwardRef(() => PreviewService))
    private readonly previewService: PreviewService,
    @Inject(forwardRef(() => DocumentSearchService))
    private readonly searchService: DocumentSearchService,
  ) {}

  /**
   * Create a document from uploaded files
   * @param createDocumentDto - Document creation data
   * @param userId - User ID
   * @returns Created document
   */
  async createDocument(
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<CreateDocumentResponse> {
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

      // Validate files
      const files = await this.validateFiles(fileIds, userId);

      // Determine category
      const { finalCategoryId, suggestedCategory } =
        await this.determineCategory(
          categoryId,
          useAI,
          aiAnalysis,
          title,
          description,
          tags,
        );

      // Get category entity
      const category = await this.getCategory(finalCategoryId);

      // Determine moderation status
      const wantsPublic = Boolean(isPublic);
      const moderationStatus = wantsPublic
        ? DocumentModerationStatus.PENDING
        : DocumentModerationStatus.APPROVED;

      // Create document
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
          downloadCost: downloadCost ?? null,
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

      // Create document-file relationships (required synchronously for response)
      const documentFiles = await this.createDocumentFiles(document.id, files);

      // Run background tasks asynchronously - don't make user wait
      void this.runBackgroundTasks(
        document,
        userId,
        fileIds,
        wantsPublic,
        useAI,
        aiAnalysis,
        categoryId,
        suggestedCategory,
        title,
        description,
        tags,
      );

      this.logger.log(`Document creation completed: ${document.id}`);

      return {
        ...document,
        files: documentFiles.map(df => df.file),
        aiSuggestedCategory: suggestedCategory,
      };
    } catch (error) {
      this.logger.error('Error creating document:', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Đã xảy ra lỗi khi tạo tài liệu');
    }
  }

  /**
   * Update a document
   * @param documentId - Document ID
   * @param userId - User ID
   * @param updateData - Update data
   * @param userRole - Optional user role
   * @returns Updated document
   */
  async updateDocument(
    documentId: string,
    userId: string,
    updateData: UpdateDocumentDto,
    userRole?: string,
  ): Promise<UpdateDocumentResponse> {
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

      const { dataToUpdate, needsReModeration } = await this.buildUpdateData(
        updateData,
        document,
      );

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
            include: { file: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      this.logger.log(`Document ${documentId} updated by user ${userId}`);

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
        originalDownloadCost: updatedDocument.downloadCost,
        systemDefaultDownloadCost: settings.downloadCost,
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
        needsReModeration,
      };
    } catch (error) {
      this.logger.error(`Error updating document ${documentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể cập nhật tài liệu');
    }
  }

  /**
   * Delete a document
   * @param documentId - Document ID
   * @param userId - User ID
   * @returns Success status
   */
  async deleteDocument(
    documentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Deleting document ${documentId} by user ${userId}`);

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: { include: { file: true } },
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException('Bạn không có quyền xóa tài liệu này');
      }

      await this.prisma.$transaction(async prisma => {
        await prisma.documentFile.deleteMany({ where: { documentId } });
        await prisma.view.deleteMany({ where: { documentId } });
        await prisma.download.deleteMany({ where: { documentId } });
        await prisma.rating.deleteMany({ where: { documentId } });
        await prisma.comment.deleteMany({ where: { documentId } });
        await prisma.aIAnalysis.deleteMany({ where: { documentId } });
        await prisma.document.delete({ where: { id: documentId } });
      });

      this.logger.log(`Document ${documentId} deleted successfully`);
      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting document ${documentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể xóa tài liệu');
    }
  }

  /**
   * Get or create default category
   * @returns Default category
   */
  async getOrCreateDefaultCategory(): Promise<{
    id: string;
    name: string;
    description: string | null;
  }> {
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

    return {
      id: category.id,
      name: category.name,
      description: category.description,
    };
  }

  // ============ Private Helper Methods ============

  private async validateFiles(
    fileIds: string[],
    userId: string,
  ): Promise<any[]> {
    const files = await this.prisma.file.findMany({
      where: { id: { in: fileIds }, uploaderId: userId },
    });

    if (files.length !== fileIds.length) {
      this.logger.error(
        `Files validation failed. Found ${files.length}, expected ${fileIds.length}`,
      );
      throw new BadRequestException(
        'Một số tệp không tìm thấy hoặc không thuộc về người dùng',
      );
    }

    this.logger.log(
      `Files validated: ${files.map(f => f.originalName).join(', ')}`,
    );
    return files;
  }

  /**
   * Run background tasks after document creation
   * These tasks are not required for the immediate response
   */
  private async runBackgroundTasks(
    document: any,
    userId: string,
    fileIds: string[],
    wantsPublic: boolean,
    useAI: boolean,
    aiAnalysis: any,
    categoryId: string | undefined,
    suggestedCategory: CategorySuggestion | null,
    title: string,
    description?: string,
    tags: string[] = [],
  ): Promise<void> {
    try {
      // Award points for uploading (non-blocking)
      await this.awardUploadPoints(userId, document.id);

      // Handle AI analysis and moderation
      if (useAI && aiAnalysis?.confidence && aiAnalysis.confidence > 0) {
        await this.saveAIAnalysis(document.id, aiAnalysis);

        if (wantsPublic) {
          await this.handlePublicDocumentModeration(
            document.id,
            document.uploaderId,
            aiAnalysis.confidence,
          );
        }
      } else if (wantsPublic && !useAI) {
        await this.triggerAutoAnalysis(
          document,
          fileIds,
          userId,
          categoryId,
          suggestedCategory,
          title,
          description,
          tags,
        );
      }

      // Generate embedding for search
      if (document.isApproved && wantsPublic) {
        await this.searchService
          .generateDocumentEmbedding(document.id)
          .catch(err =>
            this.logger.warn(`Failed to generate embedding: ${err.message}`),
          );
      }

      // Generate previews
      await this.previewService
        .generatePreviews(document.id)
        .catch(err =>
          this.logger.warn(`Failed to generate previews: ${err.message}`),
        );

      this.logger.log(`Background tasks completed for document ${document.id}`);
    } catch (error) {
      this.logger.error(
        `Error in background tasks for document ${document.id}: ${error.message}`,
      );
    }
  }

  private async determineCategory(
    categoryId: string | undefined,
    useAI: boolean,
    aiAnalysis: any,
    title: string,
    description?: string,
    tags: string[] = [],
  ): Promise<{
    finalCategoryId: string | undefined;
    suggestedCategory: CategorySuggestion | null;
  }> {
    let finalCategoryId = categoryId;
    let suggestedCategory: CategorySuggestion | null = null;

    if (!categoryId && (useAI || aiAnalysis)) {
      this.logger.log('No category provided, using AI to suggest...');

      try {
        suggestedCategory =
          await this.categoriesService.suggestBestCategoryFromContent({
            title: aiAnalysis?.title || title,
            description: aiAnalysis?.description || description,
            tags: aiAnalysis?.tags || tags,
            summary: aiAnalysis?.summary,
            keyPoints: aiAnalysis?.keyPoints,
          });

        if (suggestedCategory?.categoryId) {
          finalCategoryId = suggestedCategory.categoryId;
          this.logger.log(
            `AI suggested category: ${suggestedCategory.categoryName} (${suggestedCategory.confidence}%)`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get AI category suggestion: ${error.message}`,
        );
      }
    }

    return { finalCategoryId, suggestedCategory };
  }

  private async getCategory(
    categoryId: string | undefined,
  ): Promise<{ id: string; name: string }> {
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        this.logger.error(`Category not found: ${categoryId}`);
        throw new BadRequestException('Không tìm thấy danh mục');
      }

      this.logger.log(`Using category: ${category.name} (${category.id})`);
      return category;
    }

    return this.getOrCreateDefaultCategory();
  }

  private async awardUploadPoints(
    userId: string,
    documentId: string,
  ): Promise<void> {
    try {
      await this.pointsService.awardOnUpload(userId, documentId);
    } catch (e) {
      this.logger.warn(
        `Failed to award points for upload of document ${documentId}: ${e?.message}`,
      );
    }
  }

  private async createDocumentFiles(
    documentId: string,
    files: any[],
  ): Promise<any[]> {
    const documentFiles = await Promise.all(
      files.map((file, index) =>
        this.prisma.documentFile.create({
          data: {
            documentId,
            fileId: file.id,
            order: index,
          },
          include: { file: true },
        }),
      ),
    );

    this.logger.log(
      `Document-file relationships created: ${documentFiles.length} files`,
    );
    return documentFiles;
  }

  private async saveAIAnalysis(
    documentId: string,
    aiAnalysis: any,
  ): Promise<void> {
    try {
      await this.prisma.aIAnalysis.create({
        data: {
          documentId,
          summary: aiAnalysis.summary,
          keyPoints: aiAnalysis.keyPoints || [],
          suggestedTags: aiAnalysis.tags || [],
          difficulty: aiAnalysis.difficulty || 'beginner',
          language: aiAnalysis.language || 'en',
          confidence: aiAnalysis.confidence,
        },
      });
      this.logger.log(`AI analysis saved for document ${documentId}`);
    } catch (error) {
      this.logger.warn(`Failed to save AI analysis: ${error.message}`);
    }
  }

  private async handlePublicDocumentModeration(
    documentId: string,
    uploaderId: string,
    confidence: number,
  ): Promise<void> {
    try {
      await this.similarityJobService.runSimilarityDetectionSync(documentId);
      this.logger.log(
        `Similarity detection completed for document ${documentId}`,
      );
    } catch (simError) {
      this.logger.warn(`Similarity detection failed: ${simError.message}`);
    }

    try {
      const moderationScore = confidence || 50;
      const moderationResult = await this.aiService.applyModerationSettings(
        documentId,
        moderationScore,
      );

      this.logger.log(
        `AI moderation applied for document ${documentId}: ${moderationResult.status}`,
      );

      if (
        moderationResult.status === 'approved' ||
        moderationResult.status === 'rejected'
      ) {
        await this.updateModerationStatus(
          documentId,
          uploaderId,
          moderationResult,
          moderationScore,
        );
      }
    } catch (moderationError) {
      this.logger.warn(
        `Failed to apply AI moderation: ${moderationError.message}`,
      );
    }
  }

  private async updateModerationStatus(
    documentId: string,
    uploaderId: string,
    moderationResult: { status: string; action: string; reason?: string },
    moderationScore: number,
  ): Promise<void> {
    const isApproved = moderationResult.status === 'approved';
    const moderatedAt = new Date();
    const actionText =
      moderationResult.action === 'auto_approved' ? 'phê duyệt' : 'từ chối';
    const moderationNotes = `AI Tự động ${actionText}: Điểm ${moderationScore}% - ${moderationResult.reason || 'Không có lý do'}`;

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        moderationStatus: isApproved ? 'APPROVED' : 'REJECTED',
        isApproved,
        moderatedAt,
        moderationNotes,
      },
    });

    try {
      await this.notifications.emitToUploaderOfDocument(uploaderId, {
        type: 'moderation',
        documentId,
        status: isApproved ? 'approved' : 'rejected',
        notes: moderationNotes,
        reason: moderationResult.reason,
      });
    } catch (notificationError) {
      this.logger.warn(
        `Failed to send moderation notification: ${notificationError.message}`,
      );
    }
  }

  private async triggerAutoAnalysis(
    document: any,
    fileIds: string[],
    userId: string,
    originalCategoryId: string | undefined,
    existingSuggestion: CategorySuggestion | null,
    title: string,
    description?: string,
    tags: string[] = [],
  ): Promise<CategorySuggestion | null> {
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

        // Update category if not specified
        if (!originalCategoryId && !existingSuggestion) {
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
            aiSuggestion.categoryId !== document.categoryId
          ) {
            await this.prisma.document.update({
              where: { id: document.id },
              data: { categoryId: aiSuggestion.categoryId },
            });
            this.logger.log(
              `Document category updated to AI suggested: ${aiSuggestion.categoryName}`,
            );
            return aiSuggestion;
          }
        }

        // Handle moderation
        await this.handlePublicDocumentModeration(
          document.id,
          document.uploaderId,
          aiResult.data.moderationScore || 50,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Unable to generate AI analysis for document ${document.id}: ${error.message}`,
      );
    }

    return existingSuggestion;
  }

  private async buildUpdateData(
    updateData: UpdateDocumentDto,
    document: { isPublic: boolean },
  ): Promise<{ dataToUpdate: any; needsReModeration: boolean }> {
    const dataToUpdate: any = {};
    let needsReModeration = false;

    if (updateData.title !== undefined) {
      dataToUpdate.title = updateData.title;
    }

    if (updateData.description !== undefined) {
      dataToUpdate.description = updateData.description;
    }

    if (updateData.categoryId !== undefined) {
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

    if (updateData.downloadCost !== undefined) {
      dataToUpdate.downloadCost = updateData.downloadCost;
    }

    if (updateData.filesEdited) {
      needsReModeration = true;
      dataToUpdate.moderationStatus = DocumentModerationStatus.PENDING;
      dataToUpdate.isApproved = false;
    }

    if (updateData.isPublic !== undefined) {
      const wasPublic = document.isPublic;
      const wantsPublic = updateData.isPublic;

      if (!wasPublic && wantsPublic) {
        dataToUpdate.isPublic = true;
        dataToUpdate.isApproved = false;
        dataToUpdate.moderationStatus = DocumentModerationStatus.PENDING;
        needsReModeration = true;
      } else if (wasPublic && !wantsPublic) {
        dataToUpdate.isPublic = false;
        if (!needsReModeration) {
          dataToUpdate.isApproved = true;
        }
      }
    }

    return { dataToUpdate, needsReModeration };
  }
}
