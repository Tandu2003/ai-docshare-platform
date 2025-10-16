import { HTTP_MESSAGES, HTTP_STATUS } from '../constants/http.constants';
import { AppError, ValidationError } from '../errors';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ErrorUtils } from '../utils/error.utils';
import { ResponseHelper } from './response.helper';
import { Response } from 'express';

export class HttpErrorHelper {
  /**
   * Bad Request response (400)
   */
  static badRequest(
    res: Response,
    message: string = HTTP_MESSAGES.BAD_REQUEST,
    error?: any,
  ): Response<ApiResponse> {
    return ResponseHelper.error(res, message, HTTP_STATUS.BAD_REQUEST, error);
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = HTTP_MESSAGES.UNAUTHORIZED,
  ): Response<ApiResponse> {
    return ResponseHelper.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(
    res: Response,
    message: string = HTTP_MESSAGES.FORBIDDEN,
  ): Response<ApiResponse> {
    return ResponseHelper.error(res, message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Not Found response (404)
   */
  static notFound(
    res: Response,
    message: string = HTTP_MESSAGES.NOT_FOUND,
  ): Response<ApiResponse> {
    return ResponseHelper.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Validation Error response (422)
   */
  static validationError(
    res: Response,
    errors: any,
    message: string = HTTP_MESSAGES.VALIDATION_FAILED,
  ): Response<ApiResponse> {
    return ResponseHelper.error(
      res,
      message,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errors,
    );
  }

  /**
   * Conflict response (409)
   */
  static conflict(
    res: Response,
    message: string = HTTP_MESSAGES.CONFLICT,
    error?: any,
  ): Response<ApiResponse> {
    return ResponseHelper.error(res, message, HTTP_STATUS.CONFLICT, error);
  }

  /**
   * Too Many Requests response (429)
   */
  static tooManyRequests(
    res: Response,
    message: string = HTTP_MESSAGES.TOO_MANY_REQUESTS,
  ): Response<ApiResponse> {
    return ResponseHelper.error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  /**
   * Internal Server Error response (500)
   */
  static internalError(
    res: Response,
    message: string = HTTP_MESSAGES.INTERNAL_ERROR,
    error?: any,
  ): Response<ApiResponse> {
    return ResponseHelper.error(
      res,
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error,
    );
  }

  /**
   * Handle AppError instances automatically
   */
  static handleAppError(res: Response, error: AppError): Response<ApiResponse> {
    const statusCode = error.statusCode;
    const message = error.message;
    const errorData =
      error instanceof ValidationError ? error.errors : undefined;

    return ResponseHelper.error(res, message, statusCode, errorData);
  }

  /**
   * Handle any error type safely
   */
  static handleError(res: Response, error: unknown): Response<ApiResponse> {
    const normalizedError = ErrorUtils.normalizeError(error);
    return this.handleAppError(res, normalizedError);
  }
}
