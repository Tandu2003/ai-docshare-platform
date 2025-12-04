import { AppError } from './app.error';

/**
 * HTTP Status codes for common errors
 */
const HTTP_ERROR_CODES = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
} as const;

/**
 * Not Found error (404)
 *
 * Use when requested resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, HTTP_ERROR_CODES.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 *
 * Use when there's a conflict with existing resource state.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Xung đột tài nguyên') {
    super(message, HTTP_ERROR_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit error (429)
 *
 * Use when user exceeds allowed request rate.
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Quá nhiều yêu cầu') {
    super(message, HTTP_ERROR_CODES.TOO_MANY_REQUESTS);
    this.name = 'RateLimitError';
  }
}
