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

      // Validate files belong to user
      const files = await this.prisma.file.findMany({
        where: {
          id: { in: request.fileIds },
          uploaderId: request.userId,
        },
      });

      if (files.length === 0) {
        throw new Error('No valid files found for analysis');
      }

      if (files.length !== request.fileIds.length) {
        this.logger.warn(
          `Some files not found or don't belong to user. Expected: ${request.fileIds.length}, Found: ${files.length}`,
        );
      }

      // Get secure URLs for files
      const fileUrls = await Promise.all(
        files.map(async file => {
          try {
            return await this.filesService.getSecureFileUrl(
              file.id,
              request.userId,
            );
          } catch (error) {
            this.logger.error(
              `Error getting secure URL for file ${file.id}:`,
              error,
            );
            return null;
          }
        }),
      );

      const validUrls = fileUrls.filter(url => url !== null);

      if (validUrls.length === 0) {
        throw new Error('No accessible file URLs found');
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
          processedAt: new Date(),
        },
        create: {
          documentId,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints || [],
          suggestedTags: analysis.tags || [],
          difficulty: analysis.difficulty || 'beginner',
          language: analysis.language || 'vi',
          confidence: analysis.confidence || 0,
          processedAt: new Date(),
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
}
