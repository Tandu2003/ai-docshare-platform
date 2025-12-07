import { AppError } from './app.error';

const HTTP_ERROR_CODES = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
} as const;
export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, HTTP_ERROR_CODES.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Xung đột tài nguyên') {
    super(message, HTTP_ERROR_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Quá nhiều yêu cầu') {
    super(message, HTTP_ERROR_CODES.TOO_MANY_REQUESTS);
    this.name = 'RateLimitError';
  }
}
