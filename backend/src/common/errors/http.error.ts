import { AppError } from './app.error';

export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Xung đột tài nguyên') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Quá nhiều yêu cầu') {
    super(message, 429);
  }
}
