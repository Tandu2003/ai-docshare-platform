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

  runSimilarityDetectionSync(documentId: string): void {
    try {
      this.logger.log(
        `Queuing background similarity detection for document ${documentId}`,
      );

      // Run in background - don't block the request
      // Use setImmediate to ensure it runs after current event loop
      setImmediate(() => {
        this.similarityService
          .processSimilarityDetection(documentId)
          .then(() => {
            this.logger.log(
              `Background similarity detection completed for document ${documentId}`,
            );
          })
          .catch(error => {
            this.logger.error(
              `Error in background similarity detection for ${documentId}:`,
              error.message,
            );
          });
      });

      this.logger.log(`Similarity detection queued for document ${documentId}`);
    } catch (error) {
      this.logger.error(
        `Error queuing similarity detection for ${documentId}:`,
        error,
      );
      // Don't throw - just log the error, moderation should continue
    }
  }
}
