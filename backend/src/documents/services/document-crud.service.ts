import { CreateDocumentDto } from '../dto/create-document.dto';
import { UpdateDocumentDto } from '../dto/update-document.dto';
import { DocumentSearchService } from './document-search.service';
import { AIService } from '@/ai/ai.service';
import { EmbeddingService } from '@/ai/embedding.service';
import { CategoriesService } from '@/categories/categories.service';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { EmbeddingTextBuilderService } from '@/common/services/embedding-text-builder.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PointsService } from '@/points/points.service';
import { PreviewQueueService } from '@/preview/preview-queue.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SimilarityJobService } from '@/similarity/similarity-job.service';
import { SimilarityService } from '@/similarity/similarity.service';
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
  readonly similarityJobId?: string | null;
  readonly similarityStatus?: string;
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
    private readonly embeddingService: EmbeddingService,
    private readonly embeddingStorage: EmbeddingStorageService,
    private readonly embeddingTextBuilder: EmbeddingTextBuilderService,
    @Inject(forwardRef(() => SimilarityService))
    private readonly similarityService: SimilarityService,
    @Inject(forwardRef(() => PreviewQueueService))
    private readonly previewQueueService: PreviewQueueService,
    @Inject(forwardRef(() => DocumentSearchService))
    private readonly searchService: DocumentSearchService,
  ) {}

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

      // Create document-file relationships (required synchronously for response)
      const documentFiles = await this.createDocumentFiles(document.id, files);

      // Run remaining background tasks asynchronously
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
        false, // Don't skip embedding - let background task handle it
      );

      return {
        ...document,
        files: documentFiles.map(df => df.file),
        aiSuggestedCategory: suggestedCategory,
        // Similarity detection now runs entirely in background.
        // Frontend can query job status via SimilarityJobService if needed.
        similarityJobId: null,
        similarityStatus: wantsPublic ? 'queued' : 'not_required',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Đã xảy ra lỗi khi tạo tài liệu');
    }
  }

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

      const { dataToUpdate, needsReModeration, needsEmbeddingRegeneration } =
        await this.buildUpdateData(updateData, document);

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

      const settings = await this.systemSettings.getPointsSettings();

      // Regenerate embedding if content changed and document is public
      if (needsEmbeddingRegeneration && updatedDocument.isPublic) {
        void this.generateEmbeddingSync(
          documentId,
          updatedDocument.title,
          updatedDocument.description,
          updatedDocument.tags,
        ).catch(err => {
          this.logger.error(
            `Failed to regenerate embedding for document ${documentId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }

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
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể cập nhật tài liệu');
    }
  }

  async deleteDocument(
    documentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
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

      return { success: true, message: 'Document deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể xóa tài liệu');
    }
  }

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
      throw new BadRequestException(
        'Một số tệp không tìm thấy hoặc không thuộc về người dùng',
      );
    }

    return files;
  }

  /**
   * Generate embedding for a document synchronously.
   * This ensures embedding is available before similarity detection.
   */
  private async generateEmbeddingSync(
    documentId: string,
    title: string,
    description?: string | null,
    tags: string[] = [],
    aiAnalysis?: any,
  ): Promise<boolean> {
    try {
      // Build embedding text from document metadata
      const embeddingText = this.embeddingTextBuilder.buildSearchEmbeddingText({
        title,
        description,
        tags,
        aiAnalysis: aiAnalysis
          ? {
              summary: aiAnalysis.summary,
              keyPoints: aiAnalysis.keyPoints,
            }
          : null,
      });

      if (!embeddingText || embeddingText.trim().length === 0) {
        this.logger.warn(
          `No content to generate embedding for document ${documentId}`,
        );
        return false;
      }

      // Generate embedding using EmbeddingService
      const embedding =
        await this.embeddingService.generateEmbedding(embeddingText);

      if (!embedding || embedding.length === 0) {
        this.logger.warn(
          `Failed to generate embedding for document ${documentId}`,
        );
        return false;
      }

      // Save embedding to database
      const model = this.embeddingService.getModelName();
      await this.embeddingStorage.saveEmbedding(documentId, embedding, model);

      this.logger.log(
        `Successfully generated embedding for document ${documentId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error generating embedding for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - embedding generation failure should not block document creation
      return false;
    }
  }

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
    embeddingAlreadyGenerated = false,
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

      // Generate embedding for search (only if not already generated synchronously)
      if (!embeddingAlreadyGenerated && document.isApproved && wantsPublic) {
        await this.searchService
          .generateDocumentEmbedding(document.id)
          .catch(() => {
            // Failed to generate embedding
          });
      }

      // Queue preview generation (non-blocking)
      this.previewQueueService.enqueue(document.id);
    } catch {
      // Error in background tasks
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
        }
      } catch {
        // Failed to get AI category suggestion
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
        throw new BadRequestException('Không tìm thấy danh mục');
      }

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
    } catch {
      // Failed to award points for upload
    }
  }

  /**
   * Wait for similarity detection job to complete
   * @param jobId - Similarity job ID
   * @param timeoutMs - Maximum time to wait in milliseconds (default 30s)
   */
  private async waitForSimilarityJobCompletion(
    jobId: string,
    timeoutMs = 30000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 1000; // Check every 1 second

    while (Date.now() - startTime < timeoutMs) {
      try {
        const job = await this.prisma.similarityJob.findUnique({
          where: { id: jobId },
        });

        if (!job) {
          this.logger.warn(`Similarity job ${jobId} not found`);
          return;
        }

        if (job.status === 'completed') {
          this.logger.log(
            `Similarity job ${jobId} completed successfully in ${Date.now() - startTime}ms`,
          );
          return;
        }

        if (job.status === 'failed') {
          this.logger.error(
            `Similarity job ${jobId} failed: ${job.errorMessage}`,
          );
          return;
        }

        // Still processing, wait before next check
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        this.logger.error(
          `Error checking similarity job status: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }
    }

    this.logger.warn(
      `Similarity job ${jobId} did not complete within ${timeoutMs}ms timeout`,
    );
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
    } catch {
      // Failed to save AI analysis
    }
  }

  private async handlePublicDocumentModeration(
    documentId: string,
    uploaderId: string,
    confidence: number,
  ): Promise<void> {
    try {
      // Ensure similarity detection has run and completed before moderation.
      const job =
        await this.similarityJobService.queueAndRunSimilarityDetection(
          documentId,
        );
      await this.waitForSimilarityJobCompletion(job.jobId);

      const moderationScore = confidence || 50;
      const moderationResult = await this.aiService.applyModerationSettings(
        documentId,
        moderationScore,
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
    } catch {
      // Failed to apply AI moderation
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
    } catch {
      // Failed to send moderation notification
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
    } catch {
      // Unable to generate AI analysis
    }

    return existingSuggestion;
  }

  private async buildUpdateData(
    updateData: UpdateDocumentDto,
    document: { id?: string; isPublic: boolean },
  ): Promise<{
    dataToUpdate: any;
    needsReModeration: boolean;
    needsEmbeddingRegeneration: boolean;
  }> {
    const dataToUpdate: any = {};
    let needsReModeration = false;
    let needsEmbeddingRegeneration = false;

    if (updateData.title !== undefined) {
      dataToUpdate.title = updateData.title;
      needsEmbeddingRegeneration = true; // Title change affects embedding
    }

    if (updateData.description !== undefined) {
      dataToUpdate.description = updateData.description;
      needsEmbeddingRegeneration = true; // Description change affects embedding
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
      needsEmbeddingRegeneration = true; // Tags change affects embedding
    }

    if (updateData.language !== undefined) {
      dataToUpdate.language = updateData.language;
    }

    if (updateData.downloadCost !== undefined) {
      dataToUpdate.downloadCost = updateData.downloadCost;
    }

    // Handle file updates
    if (updateData.fileIds !== undefined && document.id) {
      // Validate files exist
      const files = await this.prisma.file.findMany({
        where: { id: { in: updateData.fileIds } },
      });

      if (files.length !== updateData.fileIds.length) {
        throw new BadRequestException('Một hoặc nhiều tệp không tồn tại');
      }

      // Delete old document-file relationships
      await this.prisma.documentFile.deleteMany({
        where: { documentId: document.id },
      });

      // Create new document-file relationships
      await this.prisma.documentFile.createMany({
        data: updateData.fileIds.map((fileId, index) => ({
          documentId: document.id!,
          fileId,
          order: index,
        })),
      });

      // Mark as files edited for re-moderation
      needsReModeration = true;
      dataToUpdate.moderationStatus = DocumentModerationStatus.PENDING;
      dataToUpdate.isApproved = false;
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

    return { dataToUpdate, needsReModeration, needsEmbeddingRegeneration };
  }
}
