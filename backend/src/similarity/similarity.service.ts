import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { FilesService } from '../files/files.service';

export interface SimilarityResult {
  documentId: string;
  title: string;
  similarityScore: number;
  similarityType: 'content' | 'title' | 'description';
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

      // Extract text content for embedding
      const textContent = this.extractTextForEmbedding(document);

      // Generate embedding using AI service
      const embedding = await this.generateEmbedding(textContent);

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

      this.logger.log(`Embedding generated and saved for document ${documentId}`);
      return embedding;
    } catch (error) {
      this.logger.error(`Error generating embedding for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Detect similar documents for a given document
   */
  async detectSimilarDocuments(documentId: string): Promise<SimilarityDetectionResult> {
    try {
      this.logger.log(`Detecting similar documents for ${documentId}`);

      // Get source document embedding
      const sourceEmbedding = await this.prisma.documentEmbedding.findUnique({
        where: { documentId },
      });

      if (!sourceEmbedding) {
        this.logger.warn(`No embedding found for document ${documentId}`);
        return {
          hasSimilarDocuments: false,
          similarDocuments: [],
          highestSimilarityScore: 0,
          totalSimilarDocuments: 0,
        };
      }

      // Get all other document embeddings
      const allEmbeddings = await this.prisma.documentEmbedding.findMany({
        where: {
          documentId: { not: documentId },
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
      });

      // Calculate similarities
      const similarities: Array<{
        documentId: string;
        similarityScore: number;
        document: any;
      }> = [];

      for (const targetEmbedding of allEmbeddings) {
        const similarityScore = this.calculateCosineSimilarity(
          sourceEmbedding.embedding,
          targetEmbedding.embedding,
        );

        if (similarityScore >= this.SIMILARITY_THRESHOLD) {
          similarities.push({
            documentId: targetEmbedding.documentId,
            similarityScore,
            document: targetEmbedding.document,
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
          similarityType: 'content' as const,
          uploader: sim.document.uploader,
          createdAt: sim.document.createdAt.toISOString(),
        })),
        highestSimilarityScore: topSimilarities.length > 0 ? topSimilarities[0].similarityScore : 0,
        totalSimilarDocuments: topSimilarities.length,
      };

      this.logger.log(`Found ${result.totalSimilarDocuments} similar documents for ${documentId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error detecting similar documents for ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Process similarity detection in background
   */
  async processSimilarityDetection(documentId: string): Promise<void> {
    try {
      this.logger.log(`Starting background similarity processing for document ${documentId}`);

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
        const _similarityResult = await this.detectSimilarDocuments(documentId);

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

        this.logger.log(`Similarity processing completed for document ${documentId}`);
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
      this.logger.error(`Error in background similarity processing for ${documentId}:`, error);
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
      this.logger.error(`Error getting similarity results for ${documentId}:`, error);
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
      this.logger.error(`Error processing similarity decision ${similarityId}:`, error);
      throw error;
    }
  }

  // Private helper methods
  private extractTextForEmbedding(document: any): string {
    const parts: string[] = [];

    // Add title
    if (document.title) {
      parts.push(document.title);
    }

    // Add description
    if (document.description) {
      parts.push(document.description);
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

  private async generateEmbedding(_text: string): Promise<number[]> {
    // This would integrate with an embedding service
    // For now, we'll use a placeholder implementation
    // In production, you'd use OpenAI's text-embedding-ada-002 or similar
    
    // Placeholder: Generate random embedding for demo
    // In real implementation, call OpenAI API or local embedding model
    const embedding = Array.from({ length: 1536 }, () => Math.random());
    
    return embedding;
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
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
    const similarityData = similarities.map(sim => ({
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
