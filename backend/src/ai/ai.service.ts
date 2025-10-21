import { SystemSettingsService } from '../common/system-settings.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentAnalysisResult, GeminiService } from './gemini.service';
import { Injectable, Logger } from '@nestjs/common';

export interface AIAnalysisRequest {
  fileIds: string[];
  userId: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  data: DocumentAnalysisResult;
  processedFiles: number;
  processingTime: number;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
    private geminiService: GeminiService,
    private systemSettings: SystemSettingsService,
  ) {}

  /**
   * Analyze documents using AI and return metadata suggestions
   */
  async analyzeDocuments(
    request: AIAnalysisRequest,
  ): Promise<AIAnalysisResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Starting AI analysis for ${request.fileIds.length} files`,
      );
      this.logger.log(`File IDs: ${JSON.stringify(request.fileIds)}`);
      this.logger.log(`User ID: ${request.userId}`);

      // First, check if any files exist at all
      const allFiles = await this.prisma.file.findMany({
        where: {
          id: { in: request.fileIds },
        },
      });

      this.logger.log(
        `Found ${allFiles.length} files in database with provided IDs`,
      );

      // Then check which ones belong to the user
      const files = await this.prisma.file.findMany({
        where: {
          id: { in: request.fileIds },
          uploaderId: request.userId,
        },
      });

      this.logger.log(
        `Found ${files.length} files belonging to user ${request.userId}`,
      );

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

        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      if (files.length !== request.fileIds.length) {
        this.logger.warn(
          `Some files not found or don't belong to user. Expected: ${request.fileIds.length}, Found: ${files.length}`,
        );
      }

      // Get secure URLs for files
      this.logger.log(`Getting secure URLs for ${files.length} files`);
      const fileUrls = await Promise.all(
        files.map(async file => {
          try {
            this.logger.log(
              `Getting secure URL for file ${file.id} (${file.originalName})`,
            );
            const secureUrl = await this.filesService.getSecureFileUrl(
              file.id,
              request.userId,
            );
            this.logger.log(`Successfully got secure URL for file ${file.id}`);
            return secureUrl;
          } catch (error) {
            this.logger.error(
              `Error getting secure URL for file ${file.id} (${file.originalName}):`,
              error.message,
            );
            return null;
          }
        }),
      );

      const validUrls = fileUrls.filter((url): url is string => url !== null);
      this.logger.log(
        `Successfully generated ${validUrls.length} secure URLs out of ${files.length} files`,
      );

      if (validUrls.length === 0) {
        const errorMessage = `No accessible file URLs found. Tried ${files.length} files but all failed to generate secure URLs.`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      this.logger.log(`Analyzing ${validUrls.length} files with Gemini AI`);

      // Analyze with Gemini
      const analysisResult =
        await this.geminiService.analyzeDocumentFromFiles(validUrls);

      const processingTime = Date.now() - startTime;

      this.logger.log(`AI analysis completed in ${processingTime}ms`);

      return {
        success: true,
        data: analysisResult,
        processedFiles: validUrls.length,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Error in AI analysis:', error);

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
        },
        processedFiles: 0,
        processingTime,
      };
    }
  }

  /**
   * Save AI analysis to database
   */
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

      this.logger.log(`AI analysis saved for document: ${documentId}`);
    } catch (error) {
      this.logger.error('Error saving AI analysis:', error);
      throw error;
    }
  }

  /**
   * Get AI analysis for a document
   */
  async getAnalysis(documentId: string) {
    try {
      const analysis = await this.prisma.aIAnalysis.findUnique({
        where: { documentId },
      });

      return analysis;
    } catch (error) {
      this.logger.error('Error getting AI analysis:', error);
      throw error;
    }
  }

  /**
   * Apply AI moderation settings to determine document status
   */
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

        this.logger.log(
          `Document ${documentId} auto-approved with score ${moderationScore}%`,
        );

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

        this.logger.log(
          `Document ${documentId} auto-rejected with score ${moderationScore}%`,
        );

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
    } catch (error) {
      this.logger.error('Error applying moderation settings:', error);
      return {
        status: 'pending',
        action: 'manual_review',
        reason: 'Error in moderation processing',
      };
    }
  }

  /**
   * Test AI service connection
   */
  async testConnection(): Promise<{ gemini: boolean }> {
    try {
      const geminiStatus = await this.geminiService.testConnection();

      return {
        gemini: geminiStatus,
      };
    } catch (error) {
      this.logger.error('Error testing AI connections:', error);
      return {
        gemini: false,
      };
    }
  }

  /**
   * Get Prisma service instance for debugging
   */
  getPrismaService() {
    return this.prisma;
  }

  /**
   * Get files that belong to a user for AI analysis
   */
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
    } catch (error) {
      this.logger.error('Error getting user files for analysis:', error);
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Error retrieving your files',
      };
    }
  }

  /**
   * Find user's files by name (useful when multiple users have same document)
   */
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
    } catch (error) {
      this.logger.error('Error finding user files by name:', error);
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Error searching your files',
      };
    }
  }
}
