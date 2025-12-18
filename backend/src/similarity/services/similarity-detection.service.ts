import { PrismaService } from '../../prisma/prisma.service';
import { SimilarityAlgorithmService } from './similarity-algorithm.service';
import { SimilarityConfigService } from './similarity-config.service';
import { SimilarityTextExtractionService } from './similarity-text-extraction.service';
import { cosineSimilarity, NotFoundError, SEARCH_LIMITS } from '@/common';
import { ChunkingService } from '@/common/services/chunking.service';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { TextPreprocessingService } from '@/common/services/text-preprocessing.service';
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
    private readonly chunkingService: ChunkingService,
    private readonly preprocessingService: TextPreprocessingService,
    private readonly configService: SimilarityConfigService,
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

      const sourceFiles = sourceDocument.files.map(f => f.file);
      const sourceHashes = sourceFiles
        .map(f => f.fileHash)
        .filter((h): h is string => Boolean(h));

      this.logger.log(
        `Source document has ${sourceFiles.length} files with hashes: ${sourceHashes.join(', ')}`,
      );

      const exactMatches = await this.findExactFileHashMatches(
        sourceFiles,
        documentId, // Exclude the source document
      );

      const sourceTextContent =
        await this.textExtractionService.extractTextFromFiles(
          sourceDocument.files.map(f => f.file),
        );

      // Include documents that are:
      // - APPROVED and PUBLIC (fully approved documents)
      // - PENDING and PUBLIC (documents waiting for approval but intended to be public)
      // Exclude:
      // - REJECTED documents (regardless of isPublic flag)
      // - Private documents (isPublic: false)
      const otherDocumentIds = await this.prisma.document.findMany({
        where: {
          id: { not: documentId },
          isPublic: true, // Must be public
          moderationStatus: { not: 'REJECTED' }, // Exclude rejected documents
        },
        select: { id: true },
        take: 1000, // Increased limit for better similarity detection
      });

      this.logger.log(
        `Found ${otherDocumentIds.length} other documents to compare against`,
      );

      // Skip text/embedding comparison if we already have exact hash matches
      let similarities: Array<{
        documentId: string;
        similarityScore: number;
        similarityType: 'content' | 'hash' | 'text';
        document: any;
      }> = [];

      if (exactMatches.length > 0) {
        this.logger.log(
          `Skipping text/embedding comparison because ${exactMatches.length} exact hash matches found`,
        );
        similarities = exactMatches.map(match => ({
          documentId: match.documentId,
          similarityScore: 1.0,
          similarityType: 'hash' as const,
          document: match.document,
        }));
      } else {
        similarities = await this.compareDocuments(
          documentId,
          sourceDocument,
          sourceTextContent,
          exactMatches,
          otherDocumentIds,
        );
      }

      // Sort and filter
      similarities.sort((a, b) => b.similarityScore - a.similarityScore);
      const topSimilarities = similarities.slice(
        0,
        SEARCH_LIMITS.MAX_SIMILAR_DOCUMENTS,
      );

      this.logger.log(
        `Preparing to save ${topSimilarities.length} similarity results for ${documentId}`,
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
    excludeDocumentId?: string,
  ): Promise<Array<{ documentId: string; document: any }>> {
    if (sourceFiles.length === 0) {
      this.logger.debug('No source files to check for hash matches');
      return [];
    }

    const sourceHashes = sourceFiles.map(f => f.fileHash).filter(Boolean);
    if (sourceHashes.length === 0) {
      this.logger.debug('No file hashes found in source files');
      return [];
    }

    this.logger.log(
      `Searching for exact hash matches with ${sourceHashes.length} hashes: ${sourceHashes.slice(0, 3).join(', ')}${sourceHashes.length > 3 ? '...' : ''}`,
    );

    // Find ALL files with matching hashes (across all users)
    // Only include documents that are public and not rejected
    const matchingFiles = await this.prisma.file.findMany({
      where: { fileHash: { in: sourceHashes } },
      include: {
        documentFiles: {
          where: {
            document: {
              isPublic: true,
              moderationStatus: { not: 'REJECTED' },
            },
          },
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

    this.logger.log(
      `Found ${matchingFiles.length} files with matching hashes: ${sourceHashes.join(', ')}`,
    );

    // Debug: Log all file IDs found
    if (matchingFiles.length > 0) {
      const fileIds = matchingFiles.map(f => f.id);
      this.logger.debug(`Matching file IDs: ${fileIds.join(', ')}`);
    }

    const exactMatches: Array<{ documentId: string; document: any }> = [];
    const processedDocuments = new Set<string>();

    for (const file of matchingFiles) {
      this.logger.debug(
        `File ${file.id} (hash: ${file.fileHash}) has ${file.documentFiles.length} document links`,
      );

      for (const docFile of file.documentFiles) {
        const docId = docFile.document.id;
        this.logger.debug(
          `  - Document ${docId} (title: ${docFile.document.title})`,
        );

        // Skip the source document itself
        if (excludeDocumentId && docId === excludeDocumentId) {
          this.logger.debug(`    Skipping (source document)`);
          continue;
        }

        if (!processedDocuments.has(docId) && docFile.document.id) {
          this.logger.debug(`    Adding as exact match`);
          exactMatches.push({
            documentId: docId,
            document: docFile.document,
          });
          processedDocuments.add(docId);
        }
      }
    }

    if (exactMatches.length > 0) {
      this.logger.log(
        `Found ${exactMatches.length} documents with exact file hash matches`,
      );
    } else {
      this.logger.log(
        `No exact hash matches found (${matchingFiles.length} files found, all linked to source document)`,
      );
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

    // Create a Set of exact match document IDs for O(1) lookup
    const exactMatchIds = new Set(exactMatches.map(m => m.documentId));

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
        // Skip if it's the source document or already in exact matches
        if (
          targetDocument.id === documentId ||
          exactMatchIds.has(targetDocument.id)
        ) {
          continue;
        }

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

    // Add exact matches (these are documents with identical file hashes)
    this.logger.log(
      `Adding ${exactMatches.length} exact hash matches to results`,
    );
    for (const exactMatch of exactMatches) {
      similarities.push({
        documentId: exactMatch.documentId,
        similarityScore: 1.0,
        similarityType: 'hash',
        document: exactMatch.document,
      });
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
    const config = await this.configService.getConfig();
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

    if (hashSimilarity >= config.thresholds.hashMatch) {
      return {
        documentId: targetDocument.id,
        similarityScore: hashSimilarity,
        similarityType: 'hash',
        document: targetDocument,
      };
    }

    // Text similarity with preprocessing and chunking
    let textSimilarity = 0;
    try {
      const targetTextContent =
        await this.textExtractionService.extractTextFromFiles(
          targetDocument.files.map((f: any) => f.file),
          true,
        );

      // Preprocess both texts
      const preprocessedSource =
        this.preprocessingService.preprocess(sourceTextContent);
      const preprocessedTarget =
        this.preprocessingService.preprocess(targetTextContent);

      // Use chunking for long documents
      if (
        this.chunkingService.shouldChunk(preprocessedSource.text) ||
        this.chunkingService.shouldChunk(preprocessedTarget.text)
      ) {
        textSimilarity = this.compareChunkedTexts(
          preprocessedSource.text,
          preprocessedTarget.text,
          config.textWeights,
        );
      } else {
        textSimilarity = this.algorithmService.calculateTextSimilarity(
          preprocessedSource.text,
          preprocessedTarget.text,
          config.textWeights,
        );
      }
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

    // Combined score using configurable weights
    const combinedScore = this.algorithmService.calculateCombinedScore(
      hashSimilarity,
      textSimilarity,
      embeddingSimilarity,
      config.weights,
    );

    if (
      combinedScore >= config.thresholds.similarityDetection ||
      hashSimilarity > config.thresholds.hashInclude ||
      embeddingSimilarity >= config.thresholds.embeddingMatch
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

  /**
   * Compare two texts using chunking for long documents.
   * Returns the maximum similarity score among all chunk pairs.
   */
  private compareChunkedTexts(
    sourceText: string,
    targetText: string,
    textWeights: { jaccard: number; levenshtein: number },
  ): number {
    const sourceChunks = this.chunkingService.chunk(sourceText);
    const targetChunks = this.chunkingService.chunk(targetText);

    let maxSimilarity = 0;
    for (const sourceChunk of sourceChunks) {
      for (const targetChunk of targetChunks) {
        const similarity = this.algorithmService.calculateTextSimilarity(
          sourceChunk.text,
          targetChunk.text,
          textWeights,
        );
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    return maxSimilarity;
  }

  private async saveSimilarityResults(
    sourceDocumentId: string,
    similarities: Array<{
      documentId: string;
      similarityScore: number;
      similarityType: 'content' | 'hash' | 'text';
    }>,
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

    // Delete old similarity results for this document to ensure fresh data
    await this.prisma.documentSimilarity.deleteMany({
      where: { sourceDocumentId },
    });

    this.logger.log(
      `Deleted old similarity results for document ${sourceDocumentId}`,
    );

    // Map similarities with correct type information
    const similarityData = filteredSimilarities.map(sim => ({
      sourceDocumentId,
      targetDocumentId: sim.documentId,
      similarityScore: sim.similarityScore,
      similarityType: sim.similarityType, // Use actual similarity type instead of hardcoding
    }));

    // Insert new similarity results
    await this.prisma.documentSimilarity.createMany({
      data: similarityData,
    });

    this.logger.log(
      `Saved ${filteredSimilarities.length} similarity results for document ${sourceDocumentId}`,
    );
  }
}
