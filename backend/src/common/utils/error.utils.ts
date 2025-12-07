import { HTTP_STATUS } from '@/common/constants/http.constants';
import { AppError } from '@/common/errors';

export class ErrorUtils {
  static isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  }

  static getStatusCode(error: unknown): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  static normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const message = this.getErrorMessage(error);
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }

  static shouldLog(error: Error): boolean {
    if (error instanceof AppError) {
      // Don't log client errors (4xx), log server errors (5xx)
      return error.statusCode >= 500;
    }
    return true;
  }
}
