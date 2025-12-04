import { AppError } from './app.error';

/**
 * HTTP Status codes for auth errors
 */
const AUTH_ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
} as const;

/**
 * Authentication error (401 Unauthorized)
 *
 * Use when user credentials are invalid or missing.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Xác thực thất bại') {
    super(message, AUTH_ERROR_CODES.UNAUTHORIZED);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403 Forbidden)
 *
 * Use when user is authenticated but lacks permission.
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Truy cập bị từ chối') {
    super(message, AUTH_ERROR_CODES.FORBIDDEN);
    this.name = 'AuthorizationError';
  }
}
