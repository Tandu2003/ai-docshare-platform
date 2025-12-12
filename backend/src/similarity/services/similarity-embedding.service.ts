import { EmbeddingService } from '../../ai/embedding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SimilarityDetectionService } from './similarity-detection.service';
import { SimilarityTextExtractionService } from './similarity-text-extraction.service';
import { NotFoundError } from '@/common';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { EmbeddingTextBuilderService } from '@/common/services/embedding-text-builder.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class SimilarityEmbeddingService {
  private readonly logger = new Logger(SimilarityEmbeddingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly textExtractionService: SimilarityTextExtractionService,
    private readonly embeddingTextBuilder: EmbeddingTextBuilderService,
    private readonly embeddingStorage: EmbeddingStorageService,
  ) {}

  // Detection service injected lazily to avoid circular dependency
  private detectionService: SimilarityDetectionService | null = null;

  setDetectionService(detectionService: SimilarityDetectionService) {
    this.detectionService = detectionService;
  }

  /**
   * Generate or retrieve embedding for a document.
   *
   * Uses unified EmbeddingTextBuilderService for consistent embedding generation.
   * Includes file content for better similarity detection accuracy.
   *
   * @param documentId - Document ID
   * @param forceRegenerate - Force regeneration even if embedding exists
   * @returns Embedding vector
   */
  async generateDocumentEmbedding(
    documentId: string,
    forceRegenerate = false,
  ): Promise<number[]> {
    try {
      // Check if embedding already exists using raw query (Prisma can't handle vector type)
      if (!forceRegenerate) {
        const existing = await this.prisma.$queryRaw<
          Array<{ embedding: string; updated_at: Date }>
        >`
          SELECT embedding::text, "updatedAt" as updated_at
          FROM document_embeddings
          WHERE "documentId" = ${documentId}
        `;

        if (existing.length > 0 && existing[0].embedding) {
          // Parse vector string "[1,2,3]" to number[]
          const embeddingStr = existing[0].embedding;
          const parsed = JSON.parse(embeddingStr) as number[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.logger.log(
              `Using existing embedding for document ${documentId} (updated: ${existing[0].updated_at.toISOString()})`,
            );
            return parsed;
          }
        }
      }

      this.logger.log(`Generating embedding for document ${documentId}`);

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          aiAnalysis: true,
          files: { include: { file: true } },
        },
      });

      if (!document) {
        throw new NotFoundError(`Document ${documentId} not found`);
      }

      // Extract file content for similarity detection (includes file content)
      let fileContent: string | null = null;
      try {
        fileContent = await this.textExtractionService.extractTextFromFiles(
          document.files.map((f: { file: any }) => f.file),
          true, // limit text for embedding
        );
      } catch (extractError) {
        this.logger.warn(
          `Failed to extract file content for document ${documentId}: ${extractError.message}`,
        );
      }

      // Use unified embedding text builder for consistency
      const textContent =
        this.embeddingTextBuilder.buildSimilarityEmbeddingText({
          title: document.title,
          description: document.description,
          tags: document.tags || [],
          aiAnalysis: document.aiAnalysis
            ? {
                summary: document.aiAnalysis.summary,
                keyPoints: document.aiAnalysis.keyPoints,
              }
            : null,
          fileContent,
        });

      if (!textContent || textContent.trim().length === 0) {
        // Fallback to metadata-only if no content available
        const metadataText = this.embeddingTextBuilder.buildMetadataOnlyText({
          title: document.title,
          description: document.description,
          tags: document.tags || [],
          aiAnalysis: document.aiAnalysis
            ? {
                summary: document.aiAnalysis.summary,
                keyPoints: document.aiAnalysis.keyPoints,
              }
            : null,
        });

        if (!metadataText.trim()) {
          throw new BadRequestException('Không có nội dung để tạo embedding');
        }

        this.logger.warn(
          `Using metadata-only embedding for document ${documentId}`,
        );
        const embedding =
          await this.embeddingService.generateEmbedding(metadataText);

        await this.embeddingStorage.saveEmbedding(documentId, embedding);

        return embedding;
      }

      const embedding =
        await this.embeddingService.generateEmbedding(textContent);

      await this.embeddingStorage.saveEmbedding(documentId, embedding);

      this.logger.log(
        `Embedding generated and saved for document ${documentId} (${textContent.length} chars)`,
      );
      return embedding;
    } catch (error) {
      this.logger.error(
        `Error generating embedding for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể tạo embedding cho tài liệu',
      );
    }
  }

  async processSimilarityDetection(documentId: string): Promise<void> {
    if (!this.detectionService) {
      throw new InternalServerErrorException(
        'Detection service not initialized',
      );
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
        throw new InternalServerErrorException(
          'Không thể xử lý similarity detection',
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in background similarity processing for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể xử lý similarity detection',
      );
    }
  }
}
