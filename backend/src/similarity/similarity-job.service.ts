import { PrismaService } from '../prisma/prisma.service';
import { SimilarityService } from './similarity.service';
import { SystemSettingsService } from '@/common/system-settings.service';
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
    private systemSettings: SystemSettingsService,
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

  /**
   * Queue similarity detection and run in background.
   * Returns the job immediately so frontend can track status.
   */
  async queueAndRunSimilarityDetection(documentId: string): Promise<{
    jobId: string;
    status: string;
  }> {
    // Create or get existing job
    const job = await this.queueSimilarityDetection(documentId);

    // Run detection in background
    this.runSimilarityDetectionInBackground(job.id, documentId);

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  /**
   * Run similarity detection in background and update job status.
   */
  private runSimilarityDetectionInBackground(
    jobId: string,
    documentId: string,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        // Update job status to processing
        await this.prisma.similarityJob.update({
          where: { id: jobId },
          data: {
            status: 'processing',
            startedAt: new Date(),
          },
        });

        // Run similarity detection
        const result =
          await this.similarityService.detectSimilarDocuments(documentId);

        // Update job status to completed
        await this.prisma.similarityJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
          },
        });

        this.logger.log(
          `Similarity job ${jobId} completed: found ${result.totalSimilarDocuments} similar documents`,
        );

        // Auto-reject if high similarity found
        if (
          result.hasSimilarDocuments &&
          result.highestSimilarityScore >= 0.9
        ) {
          await this.autoRejectIfEnabled(documentId, result);
        }
      } catch (error) {
        // Update job status to failed
        await this.prisma.similarityJob
          .update({
            where: { id: jobId },
            data: {
              status: 'failed',
              errorMessage:
                error instanceof Error ? error.message : String(error),
              completedAt: new Date(),
            },
          })
          .catch(() => {
            // Ignore error updating job status
          });

        this.logger.error(
          `Similarity job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  /**
   * Get job status with similarity results if completed.
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    errorMessage: string | null;
    similarDocuments?: any[];
    hasSimilarDocuments?: boolean;
  }> {
    const job = await this.prisma.similarityJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new InternalServerErrorException('Job not found');
    }

    // If completed, get similarity results
    if (job.status === 'completed') {
      const similarities = await this.prisma.documentSimilarity.findMany({
        where: { sourceDocumentId: job.documentId },
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
            },
          },
        },
        orderBy: { similarityScore: 'desc' },
        take: 10,
      });

      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        errorMessage: job.errorMessage,
        hasSimilarDocuments: similarities.length > 0,
        similarDocuments: similarities.map(s => ({
          documentId: s.targetDocumentId,
          title: s.targetDocument.title,
          similarityScore: s.similarityScore,
          similarityType: s.similarityType,
          uploader: s.targetDocument.uploader,
          createdAt: s.targetDocument.createdAt.toISOString(),
        })),
      };
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      errorMessage: job.errorMessage,
    };
  }

  /**
   * Auto-reject document if similarity exceeds threshold and auto-rejection is enabled.
   */
  private async autoRejectIfEnabled(
    documentId: string,
    result: {
      highestSimilarityScore: number;
      similarDocuments: Array<{ documentId: string; title: string }>;
    },
  ): Promise<void> {
    try {
      const settings = await this.systemSettings.getAIModerationSettings();

      if (!settings.enableSimilarityAutoReject) {
        this.logger.log(
          `Auto-rejection disabled, skipping for document ${documentId}`,
        );
        return;
      }

      const similarityPercent = Math.round(result.highestSimilarityScore * 100);
      if (similarityPercent < settings.similarityAutoRejectThreshold) {
        return;
      }

      const similarDoc = result.similarDocuments[0];
      const reason = `Tài liệu tương đồng ${similarityPercent}% với "${similarDoc?.title || 'tài liệu khác'}" - vượt ngưỡng tự động từ chối ${settings.similarityAutoRejectThreshold}%`;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          moderationStatus: 'REJECTED',
          isApproved: false,
          moderatedAt: new Date(),
          moderationNotes: reason,
        },
      });

      this.logger.log(`Document ${documentId} auto-rejected: ${reason}`);
    } catch (error) {
      this.logger.error(
        `Failed to auto-reject document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
