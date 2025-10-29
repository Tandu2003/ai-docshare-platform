/**
 * Simple request queue with rate limiting
 * Helps prevent hitting API rate limits by controlling request frequency
 */

export interface QueueOptions {
  concurrency: number; // Number of concurrent requests
  interval: number; // Time window in milliseconds
  intervalCap: number; // Maximum requests per interval
}

export interface QueuedRequest<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  addedAt: number;
}

/**
 * Rate-limited request queue
 */
export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = 0;
  private requestsInInterval = 0;
  private intervalStart = Date.now();
  private options: QueueOptions;
  private requestCounter = 0;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = {
      concurrency: options.concurrency || 1,
      interval: options.interval || 60000, // 1 minute default
      intervalCap: options.intervalCap || 10, // 10 requests per minute default
    };
  }

  /**
   * Add a request to the queue
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `req-${++this.requestCounter}`;
      this.queue.push({
        id,
        fn,
        resolve,
        reject,
        addedAt: Date.now(),
      });

      this.process();
    });
  }

  /**
   * Process queued requests
   */
  private async process(): Promise<void> {
    // Check if we can process more requests
    if (this.processing >= this.options.concurrency) {
      return;
    }

    // Check rate limit
    const now = Date.now();
    const timeSinceIntervalStart = now - this.intervalStart;

    // Reset interval if needed
    if (timeSinceIntervalStart >= this.options.interval) {
      this.requestsInInterval = 0;
      this.intervalStart = now;
    }

    // Check if we've hit the interval cap
    if (this.requestsInInterval >= this.options.intervalCap) {
      // Wait until next interval
      const waitTime = this.options.interval - timeSinceIntervalStart;
      setTimeout(() => this.process(), waitTime);
      return;
    }

    // Get next request from queue
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.processing++;
    this.requestsInInterval++;

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.processing--;
      // Process next request
      setImmediate(() => this.process());
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestsInInterval: this.requestsInInterval,
      intervalCap: this.options.intervalCap,
      remainingInInterval: this.options.intervalCap - this.requestsInInterval,
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
}
