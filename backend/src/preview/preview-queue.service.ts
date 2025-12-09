import { PreviewService } from './preview.service';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

interface QueueItem {
  documentId: string;
  priority: number;
  addedAt: number;
}

@Injectable()
export class PreviewQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(PreviewQueueService.name);
  private readonly queue: QueueItem[] = [];
  private readonly processing = new Set<string>();
  private readonly maxConcurrent = 2; // Limit concurrent preview generations
  private isProcessing = false;
  private processingTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly previewService: PreviewService) {}

  onModuleDestroy(): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
  }

  /**
   * Add document to preview generation queue
   * Returns immediately without waiting for generation
   */
  enqueue(documentId: string, priority = 0): void {
    // Skip if already in queue or processing
    if (this.processing.has(documentId)) {
      this.logger.debug(`Document ${documentId} already processing, skipping`);
      return;
    }
    const existingIndex = this.queue.findIndex(
      item => item.documentId === documentId,
    );
    if (existingIndex >= 0) {
      this.logger.debug(`Document ${documentId} already in queue, skipping`);
      return;
    }

    this.queue.push({
      documentId,
      priority,
      addedAt: Date.now(),
    });

    // Sort by priority (higher first), then by addedAt (older first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.addedAt - b.addedAt;
    });

    this.logger.log(
      `Queued preview generation for document ${documentId}, queue size: ${this.queue.length}`,
    );

    // Start processing if not already running
    this.startProcessing();
  }

  /**
   * Get current queue status
   */
  getStatus(): {
    queueSize: number;
    processing: number;
    maxConcurrent: number;
  } {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
    };
  }

  private startProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processNext();
  }

  private processNext(): void {
    // Check if we can process more
    if (this.processing.size >= this.maxConcurrent) {
      this.scheduleNextCheck();
      return;
    }

    // Get next item from queue
    const item = this.queue.shift();
    if (!item) {
      this.isProcessing = false;
      return;
    }

    // Mark as processing
    this.processing.add(item.documentId);

    // Process in background (fire-and-forget)
    this.processItem(item)
      .catch(err => {
        this.logger.error(
          `Preview generation failed for ${item.documentId}: ${err.message}`,
        );
      })
      .finally(() => {
        this.processing.delete(item.documentId);
        // Continue processing queue
        setImmediate(() => this.processNext());
      });

    // Try to process more items if we have capacity
    if (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
      setImmediate(() => this.processNext());
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    const startTime = Date.now();
    this.logger.log(
      `Starting preview generation for document ${item.documentId}`,
    );

    try {
      await this.previewService.generatePreviews(item.documentId);
      const duration = Date.now() - startTime;
      this.logger.log(
        `Preview generation completed for ${item.documentId} in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Preview generation failed for ${item.documentId} after ${duration}ms: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private scheduleNextCheck(): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    this.processingTimeout = setTimeout(() => {
      this.processNext();
    }, 1000);
  }
}
