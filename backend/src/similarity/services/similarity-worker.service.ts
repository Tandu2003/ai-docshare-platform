import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

/** Worker task definition */
interface WorkerTask<T> {
  readonly id: string;
  readonly execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retryCount: number;
}

/** Worker result */
interface WorkerResult<T> {
  readonly taskId: string;
  readonly result: T;
  readonly processingTimeMs: number;
}

/** Queue status */
interface QueueStatus {
  readonly pending: number;
  readonly processing: number;
  readonly available: number;
}

@Injectable()
export class SimilarityWorkerService {
  private readonly logger = new Logger(SimilarityWorkerService.name);
  // Process tasks strictly one-by-one to guarantee ordering
  private readonly maxConcurrent = 1;
  private readonly maxQueueSize = 100;
  private readonly maxRetries = 3;
  private readonly baseBackoffMs = 100;
  private currentTasks = 0;
  private readonly queue: WorkerTask<any>[] = [];

  /**
   * Enqueue a task for processing.
   * Rejects with 429 if queue is full.
   */
  async enqueue<T>(
    taskId: string,
    execute: () => Promise<T>,
  ): Promise<WorkerResult<T>> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new HttpException(
        'Too many pending similarity detection requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return new Promise<WorkerResult<T>>((resolve, reject) => {
      const task: WorkerTask<T> = {
        id: taskId,
        execute,
        resolve: (result: T) => {
          resolve({
            taskId,
            result,
            processingTimeMs: 0,
          });
        },
        reject,
        retryCount: 0,
      };
      if (this.currentTasks < this.maxConcurrent) {
        void this.processTask(task);
      } else {
        this.queue.push(task);
      }
    });
  }

  /**
   * Check if rate limit allows new task.
   */
  checkRateLimit(): boolean {
    return this.currentTasks < this.maxConcurrent;
  }

  /**
   * Get current queue status.
   */
  getQueueStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      processing: this.currentTasks,
      available: this.maxConcurrent - this.currentTasks,
    };
  }

  /** Get max concurrent limit (for testing) */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /** Get max queue size (for testing) */
  getMaxQueueSize(): number {
    return this.maxQueueSize;
  }

  /** Get max retries (for testing) */
  getMaxRetries(): number {
    return this.maxRetries;
  }

  /** Get current task count (for testing) */
  getCurrentTaskCount(): number {
    return this.currentTasks;
  }

  private async processTask<T>(task: WorkerTask<T>): Promise<void> {
    this.currentTasks++;
    const startTime = Date.now();
    try {
      const result = await task.execute();
      const processingTimeMs = Date.now() - startTime;
      task.resolve(result);
      this.logger.debug(`Task ${task.id} completed in ${processingTimeMs}ms`);
    } catch (error) {
      if (task.retryCount < this.maxRetries) {
        task.retryCount++;
        const backoffMs = this.baseBackoffMs * Math.pow(2, task.retryCount - 1);
        this.logger.warn(
          `Task ${task.id} failed, retry ${task.retryCount}/${this.maxRetries} in ${backoffMs}ms`,
        );
        await this.delay(backoffMs);
        this.currentTasks--;
        void this.processTask(task);
        return;
      }
      this.logger.error(
        `Task ${task.id} failed after ${this.maxRetries} retries: ${error instanceof Error ? error.message : String(error)}`,
      );
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (task.retryCount >= this.maxRetries || task.retryCount === 0) {
        this.currentTasks--;
        this.processNextInQueue();
      }
    }
  }

  private processNextInQueue(): void {
    if (this.queue.length > 0 && this.currentTasks < this.maxConcurrent) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        void this.processTask(nextTask);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { WorkerTask, WorkerResult, QueueStatus };
