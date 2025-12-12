import { CategoriesService } from '../categories/categories.service';
import { NotFoundError } from '../common';
import { EmbeddingStorageService } from '../common/services/embedding-storage.service';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { DocumentAnalysisResult, GeminiService } from './gemini.service';
import { BadRequestException, Injectable } from '@nestjs/common';

export interface AIAnalysisRequest {
  fileIds: string[];
  userId: string;
}
export interface AIAnalysisResponse {
  success: boolean;
  data: DocumentAnalysisResult & {
    suggestedCategoryId?: string | null;
    suggestedCategoryName?: string | null;
    categoryConfidence?: number;
  };
  processedFiles: number;
  processingTime: number;
}

@Injectable()
export class AIService {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private geminiService: GeminiService,
    private systemSettings: SystemSettingsService,
    private embeddingService: EmbeddingService,
    private categoriesService: CategoriesService,
    private embeddingStorage: EmbeddingStorageService,
  ) {}

  async analyzeDocuments(
    request: AIAnalysisRequest,
  ): Promise<AIAnalysisResponse> {
    const startTime = Date.now();

    try {
      // First, check if any files exist at all
      const allFiles = await this.prisma.file.findMany({
        where: {
          id: { in: request.fileIds },
        },
      });

      // Then check which ones belong to the user
      const files = await this.prisma.file.findMany({
        where: {
          id: { in: request.fileIds },
          uploaderId: request.userId,
        },
      });

      if (files.length === 0) {
        // Provide more detailed error information
        let errorMessage: string;

        if (allFiles.length === 0) {
          errorMessage = `No files found with the provided IDs: ${request.fileIds.join(', ')}. Please check that the file IDs are correct and the files exist.`;
        } else {
          // Show which files exist but don't belong to the user
          const fileOwners = allFiles
            .map(file => `${file.originalName} (owned by ${file.uploaderId})`)
            .join(', ');
          errorMessage = `You don't have permission to analyze these files. The files exist but belong to other users: ${fileOwners}. You can only analyze files that you have uploaded. If you have uploaded the same document, please use your own file ID.`;
        }

        throw new BadRequestException(errorMessage);
      }

      // Get storage URLs directly from files (no need for signed URLs since we use R2 service internally)
      const validUrls = files
        .filter(file => file.storageUrl)
        .map(file => file.storageUrl);

      if (validUrls.length === 0) {
        const errorMessage = `No accessible file URLs found. Tried ${files.length} files but all failed to generate secure URLs.`;
        throw new BadRequestException(errorMessage);
      }

      // Analyze with Gemini
      const analysisResult =
        await this.geminiService.analyzeDocumentFromFiles(validUrls);

      // Suggest best category based on analysis content
      const categorySuggestion =
        await this.categoriesService.suggestBestCategoryFromContent({
          title: analysisResult.title,
          description: analysisResult.description,
          tags: analysisResult.tags,
          summary: analysisResult.summary,
          keyPoints: analysisResult.keyPoints,
        });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          ...analysisResult,
          suggestedCategoryId: categorySuggestion.categoryId,
          suggestedCategoryName: categorySuggestion.categoryName,
          categoryConfidence: categorySuggestion.confidence,
        },
        processedFiles: validUrls.length,
        processingTime,
      };
    } catch {
      const processingTime = Date.now() - startTime;

      // Return error with fallback data (Vietnamese)
      return {
        success: false,
        data: {
          title: 'Lỗi phân tích',
          description: 'Không thể phân tích nội dung tài liệu.',
          tags: ['tài liệu'],
          summary: 'Phân tích thất bại',
          keyPoints: [],
          difficulty: 'beginner',
          language: 'vi',
          confidence: 0,
          suggestedCategoryId: null,
          suggestedCategoryName: null,
          categoryConfidence: 0,
        },
        processedFiles: 0,
        processingTime,
      };
    }
  }

  async saveAnalysis(
    documentId: string,
    analysis: DocumentAnalysisResult,
  ): Promise<void> {
    try {
      await this.prisma.aIAnalysis.upsert({
        where: { documentId },
        update: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints || [],
          suggestedTags: analysis.tags || [],
          difficulty: analysis.difficulty || 'beginner',
          language: analysis.language || 'vi',
          confidence: analysis.confidence || 0,
          reliabilityScore: analysis.reliabilityScore || 0,
          processedAt: new Date(),
          // Enhanced moderation fields
          moderationScore: analysis.moderationScore || 50,
          safetyFlags: analysis.safetyFlags || [],
          isSafe: analysis.isSafe || false,
          recommendedAction: analysis.recommendedAction || 'review',
        },
        create: {
          documentId,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints || [],
          suggestedTags: analysis.tags || [],
          difficulty: analysis.difficulty || 'beginner',
          language: analysis.language || 'vi',
          confidence: analysis.confidence || 0,
          reliabilityScore: analysis.reliabilityScore || 0,
          processedAt: new Date(),
          // Enhanced moderation fields
          moderationScore: analysis.moderationScore || 50,
          safetyFlags: analysis.safetyFlags || [],
          isSafe: analysis.isSafe || false,
          recommendedAction: analysis.recommendedAction || 'review',
        },
      });

      // Generate and save embedding for the document
      await this.generateAndSaveEmbedding(documentId);
    } catch {
      // Silent error handling
    }
  }

  async generateAndSaveEmbedding(documentId: string): Promise<void> {
    try {
      // Get document with AI analysis
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          aiAnalysis: true,
        },
      });

      if (!document) {
        throw new NotFoundError(`Document ${documentId} not found`);
      }

      // Create embedding text from document content
      const embeddingParts: string[] = [];

      if (document.title) {
        embeddingParts.push(`Title: ${document.title}`);
      }

      if (document.description) {
        embeddingParts.push(`Description: ${document.description}`);
      }

      if (document.tags && document.tags.length > 0) {
        embeddingParts.push(`Tags: ${document.tags.join(', ')}`);
      }

      if (document.aiAnalysis) {
        if (document.aiAnalysis.summary) {
          embeddingParts.push(`Summary: ${document.aiAnalysis.summary}`);
        }

        if (
          document.aiAnalysis.keyPoints &&
          document.aiAnalysis.keyPoints.length > 0
        ) {
          embeddingParts.push(
            `Key Points: ${document.aiAnalysis.keyPoints.join('; ')}`,
          );
        }
      }

      const embeddingText = embeddingParts.join('\n\n');

      if (!embeddingText.trim()) {
        return;
      }

      // Generate embedding
      const embedding =
        await this.embeddingService.generateEmbedding(embeddingText);

      // Get current model name from embedding service
      const currentModel = this.embeddingService.getModelName();

      // Save to database using shared service with proper vector formatting
      await this.embeddingStorage.saveEmbedding(
        documentId,
        embedding,
        currentModel,
        '1.0',
      );
    } catch {
      // Don't throw - embedding generation is not critical for document creation
    }
  }

  async regenerateEmbedding(documentId: string): Promise<void> {
    await this.generateAndSaveEmbedding(documentId);
  }

  async getAnalysis(documentId: string) {
    const analysis = await this.prisma.aIAnalysis.findUnique({
      where: { documentId },
    });

    return analysis;
  }

  async applyModerationSettings(
    documentId: string,
    moderationScore: number,
  ): Promise<{ status: string; action: string; reason?: string }> {
    try {
      const settings = await this.systemSettings.getAIModerationSettings();

      // Check if content analysis is enabled
      if (!settings.enableContentAnalysis) {
        return {
          status: 'pending',
          action: 'manual_review',
          reason: 'Content analysis is disabled',
        };
      }

      // Check similarity with individual toggles for each checkpoint
      const similarityCheck =
        await this.checkSimilarityForModeration(documentId);

      // Auto-reject if enabled and threshold met
      if (similarityCheck.shouldReject && settings.enableSimilarityAutoReject) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { moderationStatus: 'REJECTED' },
        });

        return {
          status: 'rejected',
          action: 'auto_rejected',
          reason: similarityCheck.reason,
        };
      }

      // Manual review if enabled and threshold met
      if (
        similarityCheck.requiresManualReview &&
        settings.enableSimilarityManualReview
      ) {
        return {
          status: 'pending',
          action: 'manual_review',
          reason: similarityCheck.reason,
        };
      }

      // Check confidence threshold
      if (moderationScore < settings.confidenceThreshold) {
        return {
          status: 'pending',
          action: 'manual_review',
          reason: `Confidence score ${moderationScore}% below threshold ${settings.confidenceThreshold}%`,
        };
      }

      // Auto approval logic
      if (
        settings.enableAutoApproval &&
        moderationScore >= settings.autoApprovalThreshold
      ) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { moderationStatus: 'APPROVED' },
        });

        return {
          status: 'approved',
          action: 'auto_approved',
          reason: `Điểm ${moderationScore}% đạt ngưỡng phê duyệt ${settings.autoApprovalThreshold}%`,
        };
      }

      // Auto rejection logic
      if (
        settings.enableAutoRejection &&
        moderationScore <= settings.autoRejectThreshold
      ) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { moderationStatus: 'REJECTED' },
        });

        return {
          status: 'rejected',
          action: 'auto_rejected',
          reason: `Điểm ${moderationScore}% dưới ngưỡng từ chối ${settings.autoRejectThreshold}%`,
        };
      }

      // Default to manual review
      return {
        status: 'pending',
        action: 'manual_review',
        reason: 'Requires manual review',
      };
    } catch {
      return {
        status: 'pending',
        action: 'manual_review',
        reason: 'Error in moderation processing',
      };
    }
  }

  private async checkSimilarityForModeration(documentId: string): Promise<{
    shouldReject: boolean;
    requiresManualReview: boolean;
    reason?: string;
  }> {
    try {
      const settings = await this.systemSettings.getAIModerationSettings();

      // Get highest similarity score for this document
      const highestSimilarity = await this.prisma.documentSimilarity.findFirst({
        where: {
          sourceDocumentId: documentId,
        },
        orderBy: {
          similarityScore: 'desc',
        },
        include: {
          targetDocument: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!highestSimilarity) {
        return {
          shouldReject: false,
          requiresManualReview: false,
        };
      }

      const similarityPercent = Math.round(
        highestSimilarity.similarityScore * 100,
      );

      // Auto-reject if similarity is above auto-reject threshold
      // (Toggle check happens in applyModerationSettings)
      if (similarityPercent >= settings.similarityAutoRejectThreshold) {
        return {
          shouldReject: true,
          requiresManualReview: false,
          reason: `Tài liệu tương đồng ${similarityPercent}% với "${highestSimilarity.targetDocument.title}" - vượt ngưỡng tự động từ chối ${settings.similarityAutoRejectThreshold}%`,
        };
      }

      // Require manual review if similarity is above manual review threshold
      // (Toggle check happens in applyModerationSettings)
      if (similarityPercent >= settings.similarityManualReviewThreshold) {
        return {
          shouldReject: false,
          requiresManualReview: true,
          reason: `Tài liệu tương đồng ${similarityPercent}% với "${highestSimilarity.targetDocument.title}" - cần xem xét thủ công`,
        };
      }

      return {
        shouldReject: false,
        requiresManualReview: false,
      };
    } catch {
      return {
        shouldReject: false,
        requiresManualReview: false,
      };
    }
  }

  async testConnection(): Promise<{ gemini: boolean }> {
    try {
      const geminiStatus = await this.geminiService.testConnection();

      return {
        gemini: geminiStatus,
      };
    } catch {
      return {
        gemini: false,
      };
    }
  }

  getPrismaService() {
    return this.prisma;
  }

  async getUserFilesForAnalysis(userId: string) {
    try {
      const files = await this.prisma.file.findMany({
        where: { uploaderId: userId },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        files,
        count: files.length,
        message: `Found ${files.length} files that you can analyze`,
      };
    } catch {
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Error retrieving your files',
      };
    }
  }

  async findUserFilesByName(userId: string, fileName: string) {
    try {
      const files = await this.prisma.file.findMany({
        where: {
          uploaderId: userId,
          originalName: {
            contains: fileName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        files,
        count: files.length,
        message: `Found ${files.length} files matching "${fileName}" that you can analyze`,
      };
    } catch {
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Error searching your files',
      };
    }
  }
}
