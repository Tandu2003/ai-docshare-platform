import { AppError } from './app.error';

const AUTH_ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
} as const;
export class AuthenticationError extends AppError {
  constructor(message: string = 'Xác thực thất bại') {
    super(message, AUTH_ERROR_CODES.UNAUTHORIZED);
    this.name = 'AuthenticationError';
  }
}
export class AuthorizationError extends AppError {
  constructor(message: string = 'Truy cập bị từ chối') {
    super(message, AUTH_ERROR_CODES.FORBIDDEN);
    this.name = 'AuthorizationError';
  }
}
