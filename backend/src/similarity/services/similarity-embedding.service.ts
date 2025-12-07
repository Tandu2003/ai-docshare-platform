import { EmbeddingService } from '../../ai/embedding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SimilarityDetectionService } from './similarity-detection.service';
import { SimilarityTextExtractionService } from './similarity-text-extraction.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SimilarityEmbeddingService {
  private readonly logger = new Logger(SimilarityEmbeddingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly textExtractionService: SimilarityTextExtractionService,
  ) {}

  // Detection service injected lazily to avoid circular dependency
  private detectionService: SimilarityDetectionService | null = null;

  setDetectionService(detectionService: SimilarityDetectionService) {
    this.detectionService = detectionService;
  }

  async generateDocumentEmbedding(documentId: string): Promise<number[]> {
    try {
      this.logger.log(`Generating embedding for document ${documentId}`);

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          aiAnalysis: true,
          files: { include: { file: true } },
        },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const textContent =
        await this.textExtractionService.extractTextForEmbedding(document);

      if (!textContent || textContent.trim().length === 0) {
        this.logger.warn(
          `No text content extracted for document ${documentId}, using metadata only`,
        );
        const metadataText = [
          document.title,
          document.description || '',
          document.tags?.join(' ') || '',
          document.aiAnalysis?.summary || '',
          document.aiAnalysis?.keyPoints?.join(' ') || '',
        ]
          .filter(Boolean)
          .join(' ');

        if (!metadataText.trim()) {
          throw new Error('No content available to generate embedding');
        }

        const embedding =
          await this.embeddingService.generateEmbedding(metadataText);

        await this.prisma.documentEmbedding.upsert({
          where: { documentId },
          update: { embedding, updatedAt: new Date() },
          create: { documentId, embedding },
        });

        this.logger.log(
          `Metadata-based embedding generated for document ${documentId}`,
        );
        return embedding;
      }

      const embedding =
        await this.embeddingService.generateEmbedding(textContent);

      await this.prisma.documentEmbedding.upsert({
        where: { documentId },
        update: { embedding, updatedAt: new Date() },
        create: { documentId, embedding },
      });

      this.logger.log(
        `Embedding generated and saved for document ${documentId} (${textContent.length} chars)`,
      );
      return embedding;
    } catch (error) {
      this.logger.error(
        `Error generating embedding for document ${documentId}:`,
        error,
      );
      throw error;
    }
  }

  async processSimilarityDetection(documentId: string): Promise<void> {
    if (!this.detectionService) {
      throw new Error('Detection service not initialized');
    }

    try {
      this.logger.log(
        `Starting background similarity processing for document ${documentId}`,
      );

      const job = await this.prisma.similarityJob.create({
        data: {
          documentId,
          status: 'processing',
          startedAt: new Date(),
        },
      });

      try {
        await this.generateDocumentEmbedding(documentId);

        await this.prisma.similarityJob.update({
          where: { id: job.id },
          data: { progress: 50 },
        });

        await this.detectionService.detectSimilarDocuments(documentId);

        await this.prisma.similarityJob.update({
          where: { id: job.id },
          data: { progress: 100 },
        });

        await this.prisma.similarityJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        this.logger.log(
          `Similarity processing completed for document ${documentId}`,
        );
      } catch (error) {
        await this.prisma.similarityJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Error in background similarity processing for ${documentId}:`,
        error,
      );
      throw error;
    }
  }
}
