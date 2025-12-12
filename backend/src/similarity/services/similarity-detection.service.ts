import { PrismaService } from '../../prisma/prisma.service';
import { SimilarityAlgorithmService } from './similarity-algorithm.service';
import { SimilarityTextExtractionService } from './similarity-text-extraction.service';
import {
  cosineSimilarity,
  NotFoundError,
  SEARCH_LIMITS,
  SIMILARITY_SCORE_WEIGHTS,
  SIMILARITY_THRESHOLDS,
} from '@/common';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

export interface SimilarityResult {
  documentId: string;
  title: string;
  similarityScore: number;
  similarityType: 'content' | 'hash' | 'text' | 'title' | 'description';
  uploader: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

export interface SimilarityDetectionResult {
  hasSimilarDocuments: boolean;
  similarDocuments: SimilarityResult[];
  highestSimilarityScore: number;
  totalSimilarDocuments: number;
}

@Injectable()
export class SimilarityDetectionService {
  private readonly logger = new Logger(SimilarityDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly algorithmService: SimilarityAlgorithmService,
    private readonly textExtractionService: SimilarityTextExtractionService,
    private readonly embeddingStorage: EmbeddingStorageService,
  ) {}

  async detectSimilarDocuments(
    documentId: string,
  ): Promise<SimilarityDetectionResult> {
    try {
      this.logger.log(`Detecting similar documents for ${documentId}`);

      const sourceDocument = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: { include: { file: true } },
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

      if (!sourceDocument) {
        throw new NotFoundError(`Document ${documentId} not found`);
      }

      const exactMatches = await this.findExactFileHashMatches(
        sourceDocument.files.map(f => f.file),
      );

      const sourceTextContent =
        await this.textExtractionService.extractTextFromFiles(
          sourceDocument.files.map(f => f.file),
        );

      const otherDocumentIds = await this.prisma.document.findMany({
        where: {
          id: { not: documentId },
          OR: [
            { moderationStatus: 'APPROVED' },
            { isPublic: true },
            { isApproved: true },
          ],
        },
        select: { id: true },
        take: 500,
      });

      this.logger.log(`Comparing with ${otherDocumentIds.length} documents`);

      const similarities = await this.compareDocuments(
        documentId,
        sourceDocument,
        sourceTextContent,
        exactMatches,
        otherDocumentIds,
      );

      // Sort and filter
      similarities.sort((a, b) => b.similarityScore - a.similarityScore);
      const topSimilarities = similarities.slice(
        0,
        SEARCH_LIMITS.MAX_SIMILAR_DOCUMENTS,
      );

      // Save results
      await this.saveSimilarityResults(documentId, topSimilarities);

      const result: SimilarityDetectionResult = {
        hasSimilarDocuments: topSimilarities.length > 0,
        similarDocuments: topSimilarities.map(sim => ({
          documentId: sim.documentId,
          title: sim.document.title,
          similarityScore: sim.similarityScore,
          similarityType: sim.similarityType,
          uploader: sim.document.uploader,
          createdAt: sim.document.createdAt.toISOString(),
        })),
        highestSimilarityScore:
          topSimilarities.length > 0 ? topSimilarities[0].similarityScore : 0,
        totalSimilarDocuments: topSimilarities.length,
      };

      this.logger.log(
        `Found ${result.totalSimilarDocuments} similar documents for ${documentId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error detecting similar documents for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể phát hiện tài liệu tương tự',
      );
    }
  }

  async findExactFileHashMatches(
    sourceFiles: any[],
  ): Promise<Array<{ documentId: string; document: any }>> {
    if (sourceFiles.length === 0) return [];

    const sourceHashes = sourceFiles.map(f => f.fileHash).filter(Boolean);
    if (sourceHashes.length === 0) return [];

    const matchingFiles = await this.prisma.file.findMany({
      where: { fileHash: { in: sourceHashes } },
      include: {
        documentFiles: {
          include: {
            document: {
              include: {
                uploader: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const exactMatches: Array<{ documentId: string; document: any }> = [];
    const processedDocuments = new Set<string>();

    for (const file of matchingFiles) {
      for (const docFile of file.documentFiles) {
        const docId = docFile.document.id;
        if (!processedDocuments.has(docId) && docFile.document.id) {
          exactMatches.push({
            documentId: docId,
            document: docFile.document,
          });
          processedDocuments.add(docId);
        }
      }
    }

    return exactMatches;
  }

  private async compareDocuments(
    documentId: string,
    sourceDocument: any,
    sourceTextContent: string,
    exactMatches: Array<{ documentId: string; document: any }>,
    otherDocumentIds: Array<{ id: string }>,
  ): Promise<
    Array<{
      documentId: string;
      similarityScore: number;
      similarityType: 'content' | 'hash' | 'text';
      document: any;
    }>
  > {
    const similarities: Array<{
      documentId: string;
      similarityScore: number;
      similarityType: 'content' | 'hash' | 'text';
      document: any;
    }> = [];

    const BATCH_SIZE = 20;
    const sourceHashes = new Set<string>(
      sourceDocument.files
        .map((f: any) => f.file.fileHash)
        .filter((hash: string | null): hash is string => Boolean(hash)),
    );

    const sourceEmbedding =
      await this.embeddingStorage.getEmbedding(documentId);

    for (let i = 0; i < otherDocumentIds.length; i += BATCH_SIZE) {
      const batch = otherDocumentIds.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(d => d.id);

      const targetDocuments = await this.prisma.document.findMany({
        where: { id: { in: batchIds } },
        include: {
          files: {
            include: {
              file: {
                select: {
                  id: true,
                  fileHash: true,
                  storageUrl: true,
                  mimeType: true,
                  fileName: true,
                },
              },
            },
          },
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

      for (const targetDocument of targetDocuments) {
        if (targetDocument.id === documentId) continue;
        if (exactMatches.find(m => m.documentId === targetDocument.id))
          continue;

        const result = await this.compareWithTarget(
          sourceHashes,
          sourceTextContent,
          sourceEmbedding,
          targetDocument,
        );

        if (result) {
          similarities.push(result);
        }
      }
    }

    // Add exact matches
    for (const exactMatch of exactMatches) {
      if (!similarities.find(s => s.documentId === exactMatch.documentId)) {
        similarities.push({
          documentId: exactMatch.documentId,
          similarityScore: 1.0,
          similarityType: 'hash',
          document: exactMatch.document,
        });
      }
    }

    return similarities;
  }

  private async compareWithTarget(
    sourceHashes: Set<string>,
    sourceTextContent: string,
    sourceEmbedding: any,
    targetDocument: any,
  ): Promise<{
    documentId: string;
    similarityScore: number;
    similarityType: 'content' | 'hash' | 'text';
    document: any;
  } | null> {
    const targetHashes = new Set<string>(
      targetDocument.files
        .map((f: any) => f.file.fileHash)
        .filter((hash: string | null): hash is string => Boolean(hash)),
    );

    // Hash comparison
    let hashSimilarity = 0;
    let hashMatches = 0;
    for (const hash of sourceHashes) {
      if (targetHashes.has(hash)) hashMatches++;
    }
    if (sourceHashes.size > 0 && targetHashes.size > 0) {
      if (
        hashMatches === sourceHashes.size &&
        hashMatches === targetHashes.size
      ) {
        hashSimilarity = 1.0;
      } else {
        hashSimilarity =
          hashMatches / Math.max(sourceHashes.size, targetHashes.size);
      }
    }

    if (hashSimilarity >= SIMILARITY_THRESHOLDS.HASH_MATCH) {
      return {
        documentId: targetDocument.id,
        similarityScore: hashSimilarity,
        similarityType: 'hash',
        document: targetDocument,
      };
    }

    // Text similarity
    let textSimilarity = 0;
    try {
      const targetTextContent =
        await this.textExtractionService.extractTextFromFiles(
          targetDocument.files.map((f: any) => f.file),
          true,
        );
      const limitedSourceText = sourceTextContent.substring(0, 10000);
      const limitedTargetText = targetTextContent.substring(0, 10000);
      textSimilarity = this.algorithmService.calculateTextSimilarity(
        limitedSourceText,
        limitedTargetText,
      );
    } catch {
      // Ignore text extraction errors
    }

    // Embedding similarity - use shared cosineSimilarity function
    let embeddingSimilarity = 0;
    if (sourceEmbedding) {
      const targetEmbedding = await this.embeddingStorage.getEmbedding(
        targetDocument.id,
      );
      if (targetEmbedding) {
        embeddingSimilarity = cosineSimilarity(
          sourceEmbedding.embedding,
          targetEmbedding.embedding,
        );
      }
    }

    // Combined score using centralized weights
    const combinedScore = Math.max(
      hashSimilarity * SIMILARITY_SCORE_WEIGHTS.HASH +
        textSimilarity * SIMILARITY_SCORE_WEIGHTS.TEXT +
        embeddingSimilarity * SIMILARITY_SCORE_WEIGHTS.EMBEDDING,
      hashSimilarity,
      textSimilarity,
      embeddingSimilarity,
    );

    if (
      combinedScore >= SIMILARITY_THRESHOLDS.SIMILARITY_DETECTION ||
      hashSimilarity > SIMILARITY_THRESHOLDS.HASH_INCLUDE ||
      embeddingSimilarity >= SIMILARITY_THRESHOLDS.EMBEDDING_MATCH
    ) {
      const finalScore = Math.max(combinedScore, embeddingSimilarity);
      return {
        documentId: targetDocument.id,
        similarityScore: finalScore,
        similarityType:
          hashSimilarity === 1.0
            ? 'hash'
            : embeddingSimilarity > textSimilarity
              ? 'content'
              : 'text',
        document: targetDocument,
      };
    }

    return null;
  }

  private async saveSimilarityResults(
    sourceDocumentId: string,
    similarities: Array<{ documentId: string; similarityScore: number }>,
  ) {
    const filteredSimilarities = similarities.filter(
      sim => sim.documentId !== sourceDocumentId,
    );

    if (filteredSimilarities.length === 0) {
      this.logger.warn(
        `No valid similarities to save for document ${sourceDocumentId}`,
      );
      return;
    }

    const similarityData = filteredSimilarities.map(sim => ({
      sourceDocumentId,
      targetDocumentId: sim.documentId,
      similarityScore: sim.similarityScore,
      similarityType: 'content',
    }));

    await this.prisma.documentSimilarity.createMany({
      data: similarityData,
      skipDuplicates: true,
    });
  }
}
