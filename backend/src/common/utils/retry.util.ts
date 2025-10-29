/**
 * Retry utility with exponential backoff
 * Useful for handling rate limits and transient errors
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Check if we should retry this error
      const shouldRetry = opts.shouldRetry
        ? opts.shouldRetry(error)
        : isRetryableError(error);

      if (!shouldRetry || attempt > opts.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs,
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const actualDelay = delay + jitter;

      // Call retry callback if provided
      if (opts.onRetry) {
        opts.onRetry(error, attempt, actualDelay);
      }

      // Wait before retrying
      await sleep(actualDelay);
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Rate limit errors (429)
  if (error.status === 429 || error.statusCode === 429) {
    return true;
  }

  // Server errors (5xx)
  if (
    (error.status >= 500 && error.status < 600) ||
    (error.statusCode >= 500 && error.statusCode < 600)
  ) {
    return true;
  }

  // Network errors
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'EAI_AGAIN'
  ) {
    return true;
  }

  // Google API specific errors
  if (error.message?.includes('Resource exhausted')) {
    return true;
  }

  if (error.message?.includes('Too Many Requests')) {
    return true;
  }

  if (error.message?.includes('Quota exceeded')) {
    return true;
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a rate limit error specifically
 */
export function isRateLimitError(error: any): boolean {
  return (
    error.status === 429 ||
    error.statusCode === 429 ||
    error.message?.includes('Too Many Requests') ||
    error.message?.includes('Resource exhausted') ||
    error.message?.includes('Quota exceeded')
  );
}

/**
 * Extract retry-after header if available
 */
export function getRetryAfterMs(error: any): number | null {
  const retryAfter =
    error.response?.headers?.['retry-after'] || error.headers?.['retry-after'];

  if (!retryAfter) {
    return null;
  }

  // If retry-after is a number, it's seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // If it's a date string, calculate difference
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}
