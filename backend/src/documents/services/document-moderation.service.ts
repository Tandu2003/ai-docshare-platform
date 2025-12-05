/**
 * @fileoverview Document Moderation Service
 * @description Handles document moderation operations including auto-moderation
 * @module documents/services/document-moderation
 */

import { AIService } from '@/ai/ai.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { FilesService } from '@/files/files.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DocumentModerationStatus, Prisma } from '@prisma/client';

/** Moderation queue options */
interface ModerationQueueOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly categoryId?: string;
  readonly uploaderId?: string;
  readonly status?: DocumentModerationStatus;
  readonly sort?: 'createdAt' | 'title' | 'uploader';
  readonly order?: 'asc' | 'desc';
}

/** Moderation approval options */
interface ApprovalOptions {
  readonly notes?: string;
  readonly publish?: boolean;
}

/** Moderation rejection options */
interface RejectionOptions {
  readonly reason: string;
  readonly notes?: string;
}

/** Auto-moderation result */
interface AutoModerationResult {
  readonly shouldAutoApprove: boolean;
  readonly shouldAutoReject: boolean;
  readonly reason?: string;
}

/** Similarity check result */
interface SimilarityCheckResult {
  readonly shouldAutoReject: boolean;
  readonly requiresManualReview: boolean;
  readonly reason?: string;
  readonly highestSimilarity?: number;
  readonly similarDocumentId?: string;
}

/** Moderation queue document */
interface ModerationQueueDocument {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublic: boolean;
  readonly isApproved: boolean;
  readonly moderationStatus: DocumentModerationStatus;
  readonly moderatedAt: string | null;
  readonly moderatedById: string | null;
  readonly moderationNotes: string | null;
  readonly rejectionReason: string | null;
  readonly tags: string[];
  readonly language: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly category: { id: string; name: string } | null;
  readonly uploader: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    email: string;
    isVerified: boolean;
  };
  readonly aiAnalysis: any | null;
  readonly files: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    fileSize: bigint;
    order: number;
    thumbnailUrl: string | null;
  }>;
}

/** Moderation queue response */
interface ModerationQueueResponse {
  readonly summary: {
    readonly pendingDocuments: number;
    readonly rejectedDocuments: number;
    readonly approvedToday: number;
  };
  readonly documents: ModerationQueueDocument[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
}

@Injectable()
export class DocumentModerationService {
  private readonly logger = new Logger(DocumentModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly systemSettings: SystemSettingsService,
    private readonly filesService: FilesService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Get moderation queue with pagination and filtering
   * @param options - Queue options
   * @returns Moderation queue data
   */
  async getModerationQueue(
    options: ModerationQueueOptions,
  ): Promise<ModerationQueueResponse> {
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

    // Build where clause based on status
    // REJECTED documents may have isPublic: false, so we don't filter by isPublic for REJECTED status
    const where: Prisma.DocumentWhereInput = {
      moderationStatus: status,
    };

    // Only filter by isPublic for PENDING and APPROVED statuses
    // REJECTED documents are typically set to isPublic: false, so we include all
    if (status !== DocumentModerationStatus.REJECTED) {
      where.isPublic = true;
    }

    if (categoryId) where.categoryId = categoryId;
    if (uploaderId) where.uploaderId = uploaderId;

    const orderBy = this.buildOrderBy(sort, order);

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
              include: { file: true },
              orderBy: { order: 'asc' },
            },
            category: { select: { id: true, name: true } },
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
        // REJECTED documents may have isPublic: false, so don't filter by isPublic
        this.prisma.document.count({
          where: {
            moderationStatus: DocumentModerationStatus.REJECTED,
          },
        }),
        this.prisma.document.count({
          where: {
            isPublic: true,
            moderationStatus: DocumentModerationStatus.APPROVED,
            moderatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

      const mappedDocuments = documents.map(doc =>
        this.mapModerationDocument(doc),
      );
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
   * Get document details for moderation
   * @param documentId - Document ID
   * @returns Document details
   */
  async getDocumentForModeration(documentId: string): Promise<any> {
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
            select: { id: true, name: true, description: true },
          },
          files: {
            include: { file: true },
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
        { allowSharedAccess: true },
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
        moderatedAt: document.moderatedAt?.toISOString() ?? null,
        moderatedById: document.moderatedById,
        language: document.language,
        tags: document.tags,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        uploader: document.uploader,
        category: document.category,
        aiAnalysis: document.aiAnalysis ?? null,
        files: filesWithSecureUrls,
      };
    } catch (error) {
      this.logger.error(
        `Error getting moderation detail for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Không thể lấy chi tiết tài liệu chờ duyệt',
      );
    }
  }

  /**
   * Approve a document
   * @param documentId - Document ID
   * @param adminId - Admin user ID
   * @param options - Approval options
   * @returns Updated document
   */
  async approveDocument(
    documentId: string,
    adminId: string,
    options: ApprovalOptions = {},
  ): Promise<any> {
    const publish = options.publish ?? true;

    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: { select: { fileId: true } },
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
          moderationNotes: options.notes ?? null,
          rejectionReason: null,
        },
        include: { aiAnalysis: true },
      });

      await this.prisma.file.updateMany({
        where: { id: { in: document.files.map(f => f.fileId) } },
        data: { isPublic: publish },
      });

      void this.notifications.emitToUploaderOfDocument(
        updatedDocument.uploaderId,
        {
          type: 'moderation',
          documentId,
          status: 'approved',
          notes: options.notes ?? null,
        },
      );

      return updatedDocument;
    } catch (error) {
      this.logger.error(`Error approving document ${documentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể duyệt tài liệu này');
    }
  }

  /**
   * Reject a document
   * @param documentId - Document ID
   * @param adminId - Admin user ID
   * @param options - Rejection options
   * @returns Updated document
   */
  async rejectDocument(
    documentId: string,
    adminId: string,
    options: RejectionOptions,
  ): Promise<any> {
    if (!options.reason) {
      throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
    }

    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: { select: { fileId: true } },
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
          moderationNotes: options.notes ?? null,
          rejectionReason: options.reason,
        },
        include: { aiAnalysis: true },
      });

      await Promise.all([
        this.prisma.file.updateMany({
          where: { id: { in: document.files.map(f => f.fileId) } },
          data: { isPublic: false },
        }),
        this.prisma.documentShareLink.updateMany({
          where: { documentId },
          data: { isRevoked: true },
        }),
      ]);

      void this.notifications.emitToUploaderOfDocument(
        updatedDocument.uploaderId,
        {
          type: 'moderation',
          documentId,
          status: 'rejected',
          notes: options.notes ?? null,
          reason: options.reason,
        },
      );

      return updatedDocument;
    } catch (error) {
      this.logger.error(`Error rejecting document ${documentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể từ chối tài liệu này');
    }
  }

  /**
   * Check if document should be auto-approved or auto-rejected
   * @param documentId - Document ID
   * @returns Auto-moderation decision
   */
  async checkAutoModeration(documentId: string): Promise<AutoModerationResult> {
    try {
      const aiSettings = await this.systemSettings.getAIModerationSettings();

      // Check similarity first if enabled
      if (aiSettings.enableSimilarityCheck) {
        const similarityCheck = await this.checkSimilarityForModeration(
          documentId,
          aiSettings,
        );

        if (similarityCheck.shouldAutoReject) {
          return {
            shouldAutoApprove: false,
            shouldAutoReject: true,
            reason: similarityCheck.reason,
          };
        }

        if (similarityCheck.requiresManualReview) {
          return {
            shouldAutoApprove: false,
            shouldAutoReject: false,
            reason: similarityCheck.reason,
          };
        }
      }

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

      return this.evaluateAIAnalysis(analysis, aiSettings);
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
   * @param documentId - Document ID
   * @returns Analysis result
   */
  async generateModerationAnalysis(documentId: string): Promise<any> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: { select: { fileId: true } },
          uploader: { select: { id: true } },
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const fileIds = document.files.map(f => f.fileId);

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

      // Check for auto-moderation
      const autoModeration = await this.checkAutoModeration(documentId);
      let autoModerationResult: { action: string; reason: string } | null =
        null;

      if (autoModeration.shouldAutoApprove) {
        autoModerationResult = await this.handleAutoApproval(
          documentId,
          autoModeration.reason,
        );
      } else if (autoModeration.shouldAutoReject) {
        autoModerationResult = await this.handleAutoRejection(
          documentId,
          autoModeration.reason,
        );
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
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Không thể phân tích AI cho tài liệu này',
      );
    }
  }

  // ============ Private Helper Methods ============

  private buildOrderBy(
    sort: 'createdAt' | 'title' | 'uploader',
    order: 'asc' | 'desc',
  ): Prisma.DocumentOrderByWithRelationInput {
    switch (sort) {
      case 'title':
        return { title: order };
      case 'uploader':
        return { uploader: { username: order } };
      default:
        return { createdAt: order };
    }
  }

  private mapModerationDocument(document: any): ModerationQueueDocument {
    return {
      id: document.id,
      title: document.title,
      description: document.description,
      isPublic: document.isPublic,
      isApproved: document.isApproved,
      moderationStatus: document.moderationStatus,
      moderatedAt: document.moderatedAt?.toISOString() ?? null,
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
            reliabilityScore: document.aiAnalysis.reliabilityScore ?? 0,
            moderationScore: document.aiAnalysis.moderationScore,
            safetyFlags: document.aiAnalysis.safetyFlags,
            isSafe: document.aiAnalysis.isSafe,
            recommendedAction: document.aiAnalysis.recommendedAction,
          }
        : null,
      files: document.files.map((df: any) => ({
        id: df.file.id,
        originalName: df.file.originalName,
        mimeType: df.file.mimeType,
        fileSize: df.file.fileSize,
        order: df.order,
        thumbnailUrl: df.file.thumbnailUrl,
      })),
    };
  }

  private async checkSimilarityForModeration(
    documentId: string,
    aiSettings: {
      similarityAutoRejectThreshold: number;
      similarityManualReviewThreshold: number;
    },
  ): Promise<SimilarityCheckResult> {
    try {
      const highestSimilarity = await this.prisma.documentSimilarity.findFirst({
        where: { sourceDocumentId: documentId },
        orderBy: { similarityScore: 'desc' },
        include: {
          targetDocument: { select: { id: true, title: true } },
        },
      });

      if (!highestSimilarity) {
        return {
          shouldAutoReject: false,
          requiresManualReview: false,
          reason: 'No similar documents found',
        };
      }

      const similarityPercent = Math.round(
        highestSimilarity.similarityScore * 100,
      );

      if (similarityPercent >= aiSettings.similarityAutoRejectThreshold) {
        return {
          shouldAutoReject: true,
          requiresManualReview: false,
          reason: `Tài liệu tương đồng ${similarityPercent}% với "${highestSimilarity.targetDocument.title}"`,
          highestSimilarity: similarityPercent,
          similarDocumentId: highestSimilarity.targetDocumentId,
        };
      }

      if (similarityPercent >= aiSettings.similarityManualReviewThreshold) {
        return {
          shouldAutoReject: false,
          requiresManualReview: true,
          reason: `Tài liệu tương đồng ${similarityPercent}% với "${highestSimilarity.targetDocument.title}"`,
          highestSimilarity: similarityPercent,
          similarDocumentId: highestSimilarity.targetDocumentId,
        };
      }

      return {
        shouldAutoReject: false,
        requiresManualReview: false,
        reason: `Độ tương đồng ${similarityPercent}% nằm trong giới hạn cho phép`,
        highestSimilarity: similarityPercent,
      };
    } catch (error) {
      this.logger.error(
        `Error checking similarity for document ${documentId}:`,
        error,
      );
      return {
        shouldAutoReject: false,
        requiresManualReview: false,
        reason: 'Error checking similarity',
      };
    }
  }

  private evaluateAIAnalysis(
    analysis: { moderationScore: number; safetyFlags: string[] },
    aiSettings: {
      enableAutoRejection: boolean;
      autoRejectThreshold: number;
      enableAutoApproval: boolean;
      autoApprovalThreshold: number;
    },
  ): AutoModerationResult {
    const { moderationScore, safetyFlags } = analysis;

    // Check auto-rejection conditions
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

    // Check auto-approval conditions
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
  }

  private async handleAutoApproval(
    documentId: string,
    reason?: string,
  ): Promise<{ action: string; reason: string }> {
    this.logger.log(`Auto-approving document ${documentId}: ${reason}`);

    try {
      await this.approveDocument(documentId, 'system', {
        notes: `Tự động duyệt bởi AI: ${reason}`,
        publish: true,
      });

      return {
        action: 'approved',
        reason: reason || 'Auto-approved by AI',
      };
    } catch (error) {
      this.logger.error(
        `Failed to auto-approve document ${documentId}:`,
        error,
      );
      return {
        action: 'error',
        reason: 'Failed to auto-approve',
      };
    }
  }

  private async handleAutoRejection(
    documentId: string,
    reason?: string,
  ): Promise<{ action: string; reason: string }> {
    this.logger.log(`Auto-rejecting document ${documentId}: ${reason}`);

    try {
      await this.rejectDocument(documentId, 'system', {
        reason: `Tự động từ chối bởi AI: ${reason}`,
        notes: 'Tài liệu này đã được AI phân tích và tự động từ chối',
      });

      return {
        action: 'rejected',
        reason: reason || 'Auto-rejected by AI',
      };
    } catch (error) {
      this.logger.error(`Failed to auto-reject document ${documentId}:`, error);
      return {
        action: 'error',
        reason: 'Failed to auto-reject',
      };
    }
  }
}
