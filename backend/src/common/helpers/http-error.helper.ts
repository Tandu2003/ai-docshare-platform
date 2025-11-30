import { HTTP_MESSAGES, HTTP_STATUS } from '../constants/http.constants';
import { AppError, ValidationError } from '../errors';
import { ErrorUtils } from '../utils/error.utils';
import { ResponseHelper } from './response.helper';
import { FastifyReply } from 'fastify';

export class HttpErrorHelper {
  /**
   * Bad Request response (400)
   */
  static badRequest(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.BAD_REQUEST,
    error?: any,
  ): FastifyReply {
    return ResponseHelper.error(res, message, HTTP_STATUS.BAD_REQUEST, error);
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.UNAUTHORIZED,
  ): FastifyReply {
    return ResponseHelper.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.FORBIDDEN,
  ): FastifyReply {
    return ResponseHelper.error(res, message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Not Found response (404)
   */
  static notFound(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.NOT_FOUND,
  ): FastifyReply {
    return ResponseHelper.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Validation Error response (422)
   */
  static validationError(
    res: FastifyReply,
    errors: any,
    message: string = HTTP_MESSAGES.VALIDATION_FAILED,
  ): FastifyReply {
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
    res: FastifyReply,
    message: string = HTTP_MESSAGES.CONFLICT,
    error?: any,
  ): FastifyReply {
    return ResponseHelper.error(res, message, HTTP_STATUS.CONFLICT, error);
  }

  /**
   * Too Many Requests response (429)
   */
  static tooManyRequests(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.TOO_MANY_REQUESTS,
  ): FastifyReply {
    return ResponseHelper.error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  /**
   * Internal Server Error response (500)
   */
  static internalError(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.INTERNAL_ERROR,
    error?: any,
  ): FastifyReply {
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
  static handleAppError(res: FastifyReply, error: AppError): FastifyReply {
    const statusCode = error.statusCode;
    const message = error.message;
    const errorData =
      error instanceof ValidationError ? error.errors : undefined;

    return ResponseHelper.error(res, message, statusCode, errorData);
  }

  /**
   * Handle any error type safely
   */
  static handleError(res: FastifyReply, error: unknown): FastifyReply {
    const normalizedError = ErrorUtils.normalizeError(error);
    return this.handleAppError(res, normalizedError);
  }
}
