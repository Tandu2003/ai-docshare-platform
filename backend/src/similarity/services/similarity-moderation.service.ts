import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SimilarityModerationService {
  private readonly logger = new Logger(SimilarityModerationService.name);
  constructor(private readonly prisma: PrismaService) {}
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
}
