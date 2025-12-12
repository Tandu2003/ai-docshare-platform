import { PrismaService } from '../prisma/prisma.service';
import { SimilarityService } from './similarity.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
      const pendingJobs = await this.prisma.similarityJob.findMany({
        where: {
          status: 'pending',
        },
        include: {
          document: true,
        },
        take: 10, // Process max 10 jobs at a time
      });

      // Process all jobs in parallel and WAIT for completion
      const processPromises = pendingJobs.map(job =>
        this.similarityService
          .processSimilarityDetection(job.documentId)
          .catch(() => {
            // Failed to process job
          }),
      );

      // MUST await - similarity results must be saved before moderation check
      await Promise.all(processPromises);
    } catch {
      // Error processing pending jobs
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldJobs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await this.prisma.similarityJob.deleteMany({
        where: {
          status: 'completed',
          completedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });
    } catch {
      // Error cleaning up old jobs
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
        return existingJob;
      }

      // Create new job
      const job = await this.prisma.similarityJob.create({
        data: {
          documentId,
          status: 'pending',
        },
      });

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to create similarity job for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể tạo công việc similarity detection',
      );
    }
  }

  runSimilarityDetectionSync(documentId: string): void {
    try {
      // Run in background - don't block the request
      // Use setImmediate to ensure it runs after current event loop
      setImmediate(() => {
        this.similarityService
          .processSimilarityDetection(documentId)
          .catch(() => {
            // Error in background similarity detection
          });
      });
    } catch {
      // Don't throw - just log the error, moderation should continue
    }
  }
}
