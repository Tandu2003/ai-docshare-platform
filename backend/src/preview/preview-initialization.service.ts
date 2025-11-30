import { PrismaService } from '../prisma/prisma.service';
import { PreviewService } from './preview.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PreviewStatus } from '@prisma/client';

@Injectable()
export class PreviewInitializationService implements OnModuleInit {
  private readonly logger = new Logger(PreviewInitializationService.name);
  private readonly batchSize = 5; // Process 5 documents at a time
  private readonly delayBetweenBatches = 2000; // 2 seconds between batches

  constructor(
    private readonly prisma: PrismaService,
    private readonly previewService: PreviewService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    // Check if auto-initialization is enabled (default: true)
    const autoInit = this.configService.get<boolean>('PREVIEW_AUTO_INIT', true);

    if (!autoInit) {
      this.logger.log(
        'Preview auto-initialization is disabled (PREVIEW_AUTO_INIT=false)',
      );
      return;
    }

    // Run in background to not block server startup
    void this.initializeMissingPreviews().catch(error => {
      this.logger.error('Failed to initialize missing previews:', error);
    });
  }

  /**
   * Find and generate previews for all documents that don't have previews
   */
  async initializeMissingPreviews(): Promise<void> {
    this.logger.log(
      'Starting preview initialization for documents without previews...',
    );

    try {
      // Find documents without previews or with PENDING/FAILED status
      const documentsNeedingPreviews = await this.prisma.document.findMany({
        where: {
          OR: [
            { previewStatus: PreviewStatus.PENDING },
            { previewStatus: PreviewStatus.FAILED },
            {
              NOT: {
                previewStatus: {
                  in: [
                    PreviewStatus.PENDING,
                    PreviewStatus.PROCESSING,
                    PreviewStatus.COMPLETED,
                    PreviewStatus.FAILED,
                  ],
                },
              },
            },
          ],
          // Only approved and non-draft documents
          isApproved: true,
          isDraft: false,
          // Must have files
          files: {
            some: {},
          },
        },
        select: {
          id: true,
          title: true,
          previewStatus: true,
        },
        orderBy: {
          createdAt: 'desc', // Process newer documents first
        },
      });

      const totalDocuments = documentsNeedingPreviews.length;

      if (totalDocuments === 0) {
        this.logger.log('No documents need preview initialization');
        return;
      }

      this.logger.log(
        `Found ${totalDocuments} documents needing preview generation`,
      );

      let processedCount = 0;
      let successCount = 0;
      let failCount = 0;

      // Process in batches
      for (let i = 0; i < totalDocuments; i += this.batchSize) {
        const batch = documentsNeedingPreviews.slice(i, i + this.batchSize);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(doc => this.generatePreviewSafely(doc.id, doc.title)),
        );

        results.forEach((result, index) => {
          processedCount++;
          if (result.status === 'fulfilled' && result.value) {
            successCount++;
          } else {
            failCount++;
            if (result.status === 'rejected') {
              this.logger.warn(
                `Failed to generate preview for "${batch[index].title}": ${result.reason}`,
              );
            }
          }
        });

        // Log progress
        this.logger.log(
          `Preview initialization progress: ${processedCount}/${totalDocuments} (${successCount} success, ${failCount} failed)`,
        );

        // Delay between batches to avoid overwhelming the system
        if (i + this.batchSize < totalDocuments) {
          await this.delay(this.delayBetweenBatches);
        }
      }

      this.logger.log(
        `Preview initialization completed: ${successCount} success, ${failCount} failed out of ${totalDocuments} documents`,
      );
    } catch (error) {
      this.logger.error('Error during preview initialization:', error);
    }
  }

  /**
   * Generate preview for a single document with error handling
   */
  private async generatePreviewSafely(
    documentId: string,
    title: string,
  ): Promise<boolean> {
    try {
      this.logger.debug(`Generating preview for: ${title}`);
      const result = await this.previewService.generatePreviews(documentId);
      return result.success;
    } catch (error) {
      this.logger.warn(
        `Failed to generate preview for document ${documentId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Manual trigger to regenerate all failed previews
   */
  async regenerateFailedPreviews(): Promise<{
    processed: number;
    success: number;
    failed: number;
  }> {
    this.logger.log('Regenerating failed previews...');

    const failedDocuments = await this.prisma.document.findMany({
      where: {
        previewStatus: PreviewStatus.FAILED,
        isApproved: true,
        isDraft: false,
      },
      select: {
        id: true,
        title: true,
      },
    });

    let success = 0;
    let failed = 0;

    for (const doc of failedDocuments) {
      const result = await this.generatePreviewSafely(doc.id, doc.title);
      if (result) {
        success++;
      } else {
        failed++;
      }
      await this.delay(500); // Small delay between each
    }

    return {
      processed: failedDocuments.length,
      success,
      failed,
    };
  }

  /**
   * Regenerate ALL previews (force regenerate including completed)
   */
  async regenerateAllPreviews(): Promise<{
    processed: number;
    success: number;
    failed: number;
  }> {
    this.logger.log('Regenerating ALL document previews (force)...');

    const allDocuments = await this.prisma.document.findMany({
      where: {
        isApproved: true,
        isDraft: false,
        files: {
          some: {},
        },
      },
      select: {
        id: true,
        title: true,
        previewStatus: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Found ${allDocuments.length} documents to regenerate`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < allDocuments.length; i++) {
      const doc = allDocuments[i];
      this.logger.log(
        `[${i + 1}/${allDocuments.length}] Regenerating preview for: ${doc.title}`,
      );

      try {
        // Delete existing previews first
        await this.previewService.deletePreviews(doc.id);

        // Reset status to PENDING
        await this.prisma.document.update({
          where: { id: doc.id },
          data: {
            previewStatus: PreviewStatus.PENDING,
            previewError: null,
          },
        });

        // Generate new previews
        const result = await this.previewService.generatePreviews(doc.id);
        if (result.success) {
          success++;
          this.logger.log(`  ✓ Success (${result.previews.length} previews)`);
        } else {
          failed++;
          this.logger.warn(`  ✗ Failed: ${result.error}`);
        }
      } catch (error) {
        failed++;
        this.logger.error(`  ✗ Error: ${error.message}`);
      }

      // Delay between documents
      if (i < allDocuments.length - 1) {
        await this.delay(1000);
      }
    }

    this.logger.log(
      `Regeneration completed: ${success} success, ${failed} failed out of ${allDocuments.length}`,
    );

    return {
      processed: allDocuments.length,
      success,
      failed,
    };
  }

  /**
   * Get preview initialization status
   */
  async getInitializationStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, completed, failed, total] = await Promise.all([
      this.prisma.document.count({
        where: {
          OR: [
            { previewStatus: PreviewStatus.PENDING },
            {
              NOT: {
                previewStatus: {
                  in: [
                    PreviewStatus.PENDING,
                    PreviewStatus.PROCESSING,
                    PreviewStatus.COMPLETED,
                    PreviewStatus.FAILED,
                  ],
                },
              },
            },
          ],
        },
      }),
      this.prisma.document.count({
        where: { previewStatus: PreviewStatus.PROCESSING },
      }),
      this.prisma.document.count({
        where: { previewStatus: PreviewStatus.COMPLETED },
      }),
      this.prisma.document.count({
        where: { previewStatus: PreviewStatus.FAILED },
      }),
      this.prisma.document.count(),
    ]);

    return { pending, processing, completed, failed, total };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
