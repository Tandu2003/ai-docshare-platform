import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError, ValidationError } from '../errors';
import { ErrorUtils } from '../utils/error.utils';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let message: string;
    let error: any;

    if (exception instanceof AppError) {
      // Handle custom AppError
      statusCode = exception.statusCode;
      message = exception.message;
      error = exception instanceof ValidationError ? exception.errors : undefined;

      // Log server errors only
      if (ErrorUtils.shouldLog(exception)) {
        this.logger.error(`AppError: ${message}`, exception.stack);
      }
    } else if (exception instanceof HttpException) {
      // Handle NestJS HttpException
      statusCode = exception.getStatus();
      message = exception.message;
      error = exception.getResponse();

      if (statusCode >= 500) {
        this.logger.error(`HttpException: ${message}`, exception.stack);
      }
    } else {
      // Handle unknown errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = exception;

      this.logger.error('Unexpected error:', exception);
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      error: process.env.NODE_ENV === 'production' ? undefined : error,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    response.status(statusCode).json(errorResponse);
  }
}
