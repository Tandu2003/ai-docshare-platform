import * as crypto from 'crypto';
import { AIService } from '../ai/ai.service';
import { ContentExtractorService } from '../ai/content-extractor.service';
import { EmbeddingService } from '../ai/embedding.service';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

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
export class SimilarityService {
  private readonly logger = new Logger(SimilarityService.name);
  private readonly SIMILARITY_THRESHOLD = 0.85; // 85% similarity threshold
  private readonly MAX_SIMILAR_DOCUMENTS = 10;

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private filesService: FilesService,
    private contentExtractor: ContentExtractorService,
    private r2Service: CloudflareR2Service,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Generate embedding for a document
   */
  async generateDocumentEmbedding(documentId: string): Promise<number[]> {
    try {
      this.logger.log(`Generating embedding for document ${documentId}`);

      // Get document with AI analysis
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          aiAnalysis: true,
          files: {
            include: {
              file: true,
            },
          },
        },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Extract text content for embedding from actual file content
      const textContent = await this.extractTextForEmbedding(document);

      if (!textContent || textContent.trim().length === 0) {
        this.logger.warn(
          `No text content extracted for document ${documentId}, using metadata only`,
        );
        // Fallback to metadata-based embedding
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

        // Save embedding to database
        await this.prisma.documentEmbedding.upsert({
          where: { documentId },
          update: {
            embedding,
            updatedAt: new Date(),
          },
          create: {
            documentId,
            embedding,
          },
        });

        this.logger.log(
          `Metadata-based embedding generated for document ${documentId}`,
        );
        return embedding;
      }

      // Generate embedding using real AI embedding service
      const embedding =
        await this.embeddingService.generateEmbedding(textContent);

      // Save embedding to database
      await this.prisma.documentEmbedding.upsert({
        where: { documentId },
        update: {
          embedding,
          updatedAt: new Date(),
        },
        create: {
          documentId,
          embedding,
        },
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

  /**
   * Detect similar documents for a given document
   * Uses multiple methods: file hash comparison, text content comparison, and embedding similarity
   */
  async detectSimilarDocuments(
    documentId: string,
  ): Promise<SimilarityDetectionResult> {
    try {
      this.logger.log(`Detecting similar documents for ${documentId}`);

      // Get source document with files
      const sourceDocument = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: {
              file: true,
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

      if (!sourceDocument) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Step 1: Check for exact file hash matches (100% duplicate)
      const exactMatches = await this.findExactFileHashMatches(
        sourceDocument.files.map(f => f.file),
      );

      // Step 2: Get source document text content
      const sourceTextContent = await this.extractTextFromFiles(
        sourceDocument.files.map(f => f.file),
      );

      // Step 3: Get all other documents for comparison (in batches to avoid memory issues)
      // Compare with ALL approved documents (not just public) to detect duplicates
      // First, get document IDs only (lightweight query)
      const otherDocumentIds = await this.prisma.document.findMany({
        where: {
          id: { not: documentId },
          // Compare with approved documents OR public documents
          OR: [
            { moderationStatus: 'APPROVED' },
            { isPublic: true },
            { isApproved: true },
          ],
        },
        select: { id: true },
        take: 500, // Limit to 500 documents max to avoid memory issues
      });

      this.logger.log(`Comparing with ${otherDocumentIds.length} documents`);

      const similarities: Array<{
        documentId: string;
        similarityScore: number;
        similarityType: 'content' | 'hash' | 'text';
        document: any;
      }> = [];

      // Step 4: Compare with each document in batches (to avoid memory issues)
      const BATCH_SIZE = 20; // Process 20 documents at a time
      const sourceHashes = new Set(
        sourceDocument.files.map(f => f.file.fileHash).filter(Boolean),
      );

      // Get source embedding once
      const sourceEmbedding = await this.prisma.documentEmbedding.findUnique({
        where: { documentId },
      });

      // Process in batches
      for (let i = 0; i < otherDocumentIds.length; i += BATCH_SIZE) {
        const batch = otherDocumentIds.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(d => d.id);

        // Load documents in this batch
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

        // Compare with each document in batch
        for (const targetDocument of targetDocuments) {
          // Skip if it's the same document
          if (targetDocument.id === documentId) {
            continue;
          }

          // Skip if already found as exact match
          if (exactMatches.find(m => m.documentId === targetDocument.id)) {
            continue;
          }

          // Quick hash check first (memory efficient)
          const targetHashes = new Set(
            targetDocument.files.map(f => f.file.fileHash).filter(Boolean),
          );
          let hashSimilarity = 0;
          let hashMatches = 0;
          for (const hash of sourceHashes) {
            if (targetHashes.has(hash)) {
              hashMatches++;
            }
          }
          if (sourceHashes.size > 0 && targetHashes.size > 0) {
            if (
              hashMatches === sourceHashes.size &&
              hashMatches === targetHashes.size
            ) {
              hashSimilarity = 1.0; // Exact match
            } else {
              hashSimilarity =
                hashMatches / Math.max(sourceHashes.size, targetHashes.size);
            }
          }

          // If hash match is high, skip text extraction (saves memory)
          if (hashSimilarity >= 0.9) {
            similarities.push({
              documentId: targetDocument.id,
              similarityScore: hashSimilarity,
              similarityType: 'hash',
              document: targetDocument,
            });
            continue; // Skip further processing
          }

          // Compare text content (only if hash doesn't match)
          let textSimilarity = 0;
          try {
            // Limit text extraction length to prevent memory issues
            const targetTextContent = await this.extractTextFromFiles(
              targetDocument.files.map(f => f.file),
              true, // limitText = true
            );
            // Limit source text too if needed
            const limitedSourceText = sourceTextContent.substring(0, 10000);
            const limitedTargetText = targetTextContent.substring(0, 10000);

            textSimilarity = this.calculateTextSimilarity(
              limitedSourceText,
              limitedTargetText,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to extract text for document ${targetDocument.id}: ${error.message}`,
            );
          }

          // Use embedding similarity - NOW THE PRIMARY METHOD for content comparison
          let embeddingSimilarity = 0;
          if (sourceEmbedding) {
            const targetEmbedding =
              await this.prisma.documentEmbedding.findUnique({
                where: { documentId: targetDocument.id },
              });

            if (targetEmbedding) {
              embeddingSimilarity = this.calculateCosineSimilarity(
                sourceEmbedding.embedding,
                targetEmbedding.embedding,
              );
              this.logger.debug(
                `Embedding similarity between ${documentId} and ${targetDocument.id}: ${(embeddingSimilarity * 100).toFixed(1)}%`,
              );
            }
          }

          // Calculate combined similarity score
          // Embedding similarity is now the primary factor since it captures semantic similarity
          const combinedScore = Math.max(
            hashSimilarity * 0.3 +
              textSimilarity * 0.2 +
              embeddingSimilarity * 0.5, // Embedding now has highest weight
            hashSimilarity,
            textSimilarity,
            embeddingSimilarity, // Also consider pure embedding similarity
          );

          // Lower threshold for embedding similarity since it's semantic
          // Hash/text >= 85% OR embedding >= 70% (semantic similarity threshold is typically lower)
          const embeddingThreshold = 0.7; // 70% semantic similarity is significant
          if (
            combinedScore >= this.SIMILARITY_THRESHOLD ||
            hashSimilarity > 0.5 ||
            embeddingSimilarity >= embeddingThreshold
          ) {
            const finalScore = Math.max(combinedScore, embeddingSimilarity);
            similarities.push({
              documentId: targetDocument.id,
              similarityScore: finalScore,
              similarityType:
                hashSimilarity === 1.0
                  ? 'hash'
                  : embeddingSimilarity > textSimilarity
                    ? 'content'
                    : 'text',
              document: targetDocument,
            });

            this.logger.log(
              `Similar document found: ${targetDocument.id} - hash: ${(hashSimilarity * 100).toFixed(1)}%, text: ${(textSimilarity * 100).toFixed(1)}%, embedding: ${(embeddingSimilarity * 100).toFixed(1)}%, final: ${(finalScore * 100).toFixed(1)}%`,
            );
          }
        }

        // Force garbage collection hint between batches
        if (global.gc && i % (BATCH_SIZE * 5) === 0) {
          this.logger.log(
            `Processed ${i + batch.length} documents, clearing cache...`,
          );
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

      // Sort by similarity score (highest first)
      similarities.sort((a, b) => b.similarityScore - a.similarityScore);

      // Take top similar documents
      const topSimilarities = similarities.slice(0, this.MAX_SIMILAR_DOCUMENTS);

      // Save similarity results to database
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
        `Error detecting similar documents for ${documentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process similarity detection in background
   */
  async processSimilarityDetection(documentId: string): Promise<void> {
    try {
      this.logger.log(
        `Starting background similarity processing for document ${documentId}`,
      );

      // Create job record
      const job = await this.prisma.similarityJob.create({
        data: {
          documentId,
          status: 'processing',
          startedAt: new Date(),
        },
      });

      try {
        // Generate embedding if not exists
        await this.generateDocumentEmbedding(documentId);

        // Update progress
        await this.prisma.similarityJob.update({
          where: { id: job.id },
          data: { progress: 50 },
        });

        // Detect similar documents
        await this.detectSimilarDocuments(documentId);

        // Update progress
        await this.prisma.similarityJob.update({
          where: { id: job.id },
          data: { progress: 100 },
        });

        // Complete job
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
        // Mark job as failed
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

  /**
   * Get similarity results for admin review
   */
  async getSimilarityResultsForModeration(documentId: string) {
    try {
      const similarities = await this.prisma.documentSimilarity.findMany({
        where: {
          sourceDocumentId: documentId,
          isProcessed: false,
        },
        include: {
          targetDocument: {
            include: {
              uploader: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          similarityScore: 'desc',
        },
      });

      return similarities.map(sim => ({
        id: sim.id,
        targetDocument: {
          id: sim.targetDocument.id,
          title: sim.targetDocument.title,
          description: sim.targetDocument.description,
          uploader: sim.targetDocument.uploader,
          category: sim.targetDocument.category,
          createdAt: sim.targetDocument.createdAt.toISOString(),
        },
        similarityScore: sim.similarityScore,
        similarityType: sim.similarityType,
        createdAt: sim.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(
        `Error getting similarity results for ${documentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process admin decision on similarity
   */
  async processSimilarityDecision(
    similarityId: string,
    adminId: string,
    decision: { isDuplicate: boolean; notes?: string },
  ) {
    try {
      await this.prisma.documentSimilarity.update({
        where: { id: similarityId },
        data: {
          isDuplicate: decision.isDuplicate,
          adminNotes: decision.notes,
          isProcessed: true,
          processedAt: new Date(),
          processedById: adminId,
        },
      });

      this.logger.log(`Similarity decision processed: ${similarityId}`);
    } catch (error) {
      this.logger.error(
        `Error processing similarity decision ${similarityId}:`,
        error,
      );
      throw error;
    }
  }

  // Private helper methods

  /**
   * Find documents with exact file hash matches
   */
  private async findExactFileHashMatches(
    sourceFiles: any[],
  ): Promise<Array<{ documentId: string; document: any }>> {
    if (sourceFiles.length === 0) return [];

    const sourceHashes = sourceFiles.map(f => f.fileHash).filter(Boolean);
    if (sourceHashes.length === 0) return [];

    // Find all files with matching hashes
    const matchingFiles = await this.prisma.file.findMany({
      where: {
        fileHash: { in: sourceHashes },
      },
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

  /**
   * Extract text content from files
   * @param limitText - If true, limit text length to prevent memory issues
   */
  private async extractTextFromFiles(
    files: any[],
    limitText: boolean = false,
  ): Promise<string> {
    const textContents: string[] = [];
    const MAX_TEXT_LENGTH = limitText ? 5000 : 50000; // Limit to 5KB if limiting

    for (const file of files) {
      try {
        // Skip very large files if limiting
        if (limitText && files.length > 5) {
          // Only process first 5 files if many files
          break;
        }

        // Get file stream from R2
        const fileStream = await this.r2Service.getFileStream(file.storageUrl);

        // Convert stream to buffer with size limit
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const MAX_FILE_SIZE = limitText ? 5 * 1024 * 1024 : 50 * 1024 * 1024; // 5MB or 50MB

        for await (const chunk of fileStream) {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE) {
            this.logger.warn(
              `File ${file.fileName} too large, skipping full extraction`,
            );
            break;
          }
          chunks.push(chunk);
        }

        if (chunks.length === 0) continue;

        const buffer = Buffer.concat(chunks);

        // Extract text content
        const extracted = await this.contentExtractor.extractContent(
          buffer,
          file.mimeType,
          file.fileName,
        );

        // Limit text length
        const text = limitText
          ? extracted.text.substring(0, MAX_TEXT_LENGTH)
          : extracted.text;
        textContents.push(text);
      } catch (error) {
        this.logger.warn(
          `Failed to extract text from file ${file.id || file.fileName}: ${error.message}`,
        );
      }
    }

    return textContents.join('\n\n').trim();
  }

  /**
   * Hash text content for comparison
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Compare file hashes between two sets of files
   */
  private compareFileHashes(sourceFiles: any[], targetFiles: any[]): number {
    if (sourceFiles.length === 0 || targetFiles.length === 0) return 0;

    const sourceHashes = new Set(
      sourceFiles.map(f => f.fileHash).filter(Boolean),
    );
    const targetHashes = new Set(
      targetFiles.map(f => f.fileHash).filter(Boolean),
    );

    if (sourceHashes.size === 0 || targetHashes.size === 0) return 0;

    // Count matching hashes
    let matches = 0;
    for (const hash of sourceHashes) {
      if (targetHashes.has(hash)) {
        matches++;
      }
    }

    // If all files match, return 1.0, otherwise return ratio
    if (matches === sourceHashes.size && matches === targetHashes.size) {
      return 1.0; // Exact match
    }

    // Partial match: ratio of matching files
    return matches / Math.max(sourceHashes.size, targetHashes.size);
  }

  /**
   * Calculate text similarity using multiple methods
   * Optimized to handle large texts without memory issues
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1.0;

    // Limit text length for similarity calculation (prevent memory issues)
    const MAX_LENGTH = 3000; // Limit to 3000 chars for similarity calculation
    const limited1 = text1.substring(0, MAX_LENGTH);
    const limited2 = text2.substring(0, MAX_LENGTH);

    // Normalize texts (lowercase, remove extra whitespace)
    const normalized1 = limited1.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized2 = limited2.toLowerCase().replace(/\s+/g, ' ').trim();

    if (normalized1 === normalized2) return 1.0;

    // Calculate Jaccard similarity (word-based) - memory efficient
    const words1 = normalized1.split(/\s+/).slice(0, 500); // Limit words
    const words2 = normalized2.split(/\s+/).slice(0, 500);
    const words1Set = new Set(words1);
    const words2Set = new Set(words2);

    let intersection = 0;
    for (const word of words1Set) {
      if (words2Set.has(word)) intersection++;
    }

    const union = new Set([...words1Set, ...words2Set]);
    const jaccard = union.size > 0 ? intersection / union.size : 0;

    // For Levenshtein, only calculate if texts are short enough (< 1000 chars)
    let levenshteinSimilarity = 0;
    if (normalized1.length < 1000 && normalized2.length < 1000) {
      const levenshteinDistance = this.levenshteinDistance(
        normalized1,
        normalized2,
      );
      const maxLength = Math.max(normalized1.length, normalized2.length);
      levenshteinSimilarity =
        maxLength > 0 ? 1 - levenshteinDistance / maxLength : 0;
    } else {
      // For long texts, estimate Levenshtein using word-level comparison
      levenshteinSimilarity = jaccard; // Use Jaccard as approximation
    }

    // Combine both methods (weighted average)
    return jaccard * 0.7 + levenshteinSimilarity * 0.3;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = [];

    // Initialize DP table
    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1, // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Extract text for embedding - improved to use actual file content
   */
  private async extractTextForEmbedding(document: any): Promise<string> {
    const parts: string[] = [];

    // Add title
    if (document.title) {
      parts.push(document.title);
    }

    // Add description
    if (document.description) {
      parts.push(document.description);
    }

    // Try to extract actual text from files (most important)
    try {
      if (document.files && document.files.length > 0) {
        const fileText = await this.extractTextFromFiles(
          document.files.map((f: any) => f.file),
        );
        if (fileText) {
          // Use first 5000 characters to avoid embedding limits
          parts.push(fileText.substring(0, 5000));
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to extract file content for embedding: ${error.message}`,
      );
    }

    // Add AI analysis summary
    if (document.aiAnalysis?.summary) {
      parts.push(document.aiAnalysis.summary);
    }

    // Add AI analysis key points
    if (document.aiAnalysis?.keyPoints?.length > 0) {
      parts.push(document.aiAnalysis.keyPoints.join(' '));
    }

    // Add tags
    if (document.tags?.length > 0) {
      parts.push(document.tags.join(' '));
    }

    return parts.join(' ').trim();
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    // Handle vector length mismatch gracefully - return 0 similarity
    // This can happen when old embeddings have different dimensions than new ones
    if (vecA.length !== vecB.length) {
      this.logger.warn(
        `Vector length mismatch: ${vecA.length} vs ${vecB.length}. Returning 0 similarity.`,
      );
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private async saveSimilarityResults(
    sourceDocumentId: string,
    similarities: Array<{ documentId: string; similarityScore: number }>,
  ) {
    // Filter out any self-references (shouldn't happen but just in case)
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
