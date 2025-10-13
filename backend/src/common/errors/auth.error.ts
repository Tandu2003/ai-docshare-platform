import { AppError } from './app.error';

export class AuthenticationError extends AppError {
  constructor(message: string = 'Xác thực thất bại') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Truy cập bị từ chối') {
    super(message, 403);
  }
}
