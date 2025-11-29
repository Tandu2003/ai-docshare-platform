import { PrismaService } from '../prisma/prisma.service';
import { SimilarityService } from './similarity.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SimilarityJobService {
  private readonly logger = new Logger(SimilarityJobService.name);

  constructor(
    private prisma: PrismaService,
    private similarityService: SimilarityService,
  ) {}

  /**
   * Process pending similarity jobs immediately (called directly, not via cron)
   */
  async processPendingJobs() {
    try {
      this.logger.log('Processing pending similarity jobs');

      const pendingJobs = await this.prisma.similarityJob.findMany({
        where: {
          status: 'pending',
        },
        include: {
          document: true,
        },
        take: 10, // Process max 10 jobs at a time
      });

      this.logger.log(`Found ${pendingJobs.length} pending jobs`);

      // Process all jobs in parallel and WAIT for completion
      const processPromises = pendingJobs.map(job =>
        this.similarityService
          .processSimilarityDetection(job.documentId)
          .catch(error => {
            this.logger.error(`Failed to process job ${job.id}:`, error);
          }),
      );

      // MUST await - similarity results must be saved before moderation check
      await Promise.all(processPromises);
      this.logger.log(
        `Completed processing ${pendingJobs.length} similarity jobs`,
      );
    } catch (error) {
      this.logger.error('Error processing pending jobs:', error);
    }
  }

  /**
   * Clean up old completed jobs (older than 30 days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldJobs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await this.prisma.similarityJob.deleteMany({
        where: {
          status: 'completed',
          completedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`Cleaned up ${deletedCount.count} old similarity jobs`);
    } catch (error) {
      this.logger.error('Error cleaning up old jobs:', error);
    }
  }

  /**
   * Queue similarity detection for a document
   */
  async queueSimilarityDetection(documentId: string) {
    try {
      // Check if job already exists
      const existingJob = await this.prisma.similarityJob.findFirst({
        where: {
          documentId,
          status: { in: ['pending', 'processing'] },
        },
      });

      if (existingJob) {
        this.logger.log(
          `Similarity job already exists for document ${documentId}`,
        );
        return existingJob;
      }

      // Create new job
      const job = await this.prisma.similarityJob.create({
        data: {
          documentId,
          status: 'pending',
        },
      });

      this.logger.log(
        `Queued similarity detection job for document ${documentId}`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Error queuing similarity detection for ${documentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Run similarity detection immediately for a specific document (synchronous)
   * This is used when we need results before moderation decision
   */
  async runSimilarityDetectionSync(documentId: string): Promise<void> {
    try {
      this.logger.log(
        `Running synchronous similarity detection for document ${documentId}`,
      );

      // Process directly without job queue
      await this.similarityService.processSimilarityDetection(documentId);

      this.logger.log(
        `Synchronous similarity detection completed for document ${documentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in synchronous similarity detection for ${documentId}:`,
        error,
      );
      // Don't throw - just log the error, moderation should continue
    }
  }
}
