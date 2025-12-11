import { AppError, ValidationError } from '../errors';
import { ApiResponse } from '../interfaces/api-response.interface';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let statusCode: number;
    let message: string;
    let error: any;

    if (exception instanceof AppError) {
      // Handle custom AppError
      statusCode = exception.statusCode;
      message = exception.message;
      error =
        exception instanceof ValidationError ? exception.errors : undefined;
    } else if (exception instanceof HttpException) {
      // Handle NestJS HttpException
      statusCode = exception.getStatus();
      message = exception.message;
      error = exception.getResponse();
    } else {
      // Handle unknown errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Lỗi máy chủ nội bộ';
      error = exception;
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      error: process.env.NODE_ENV === 'production' ? undefined : error,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    response.status(statusCode).send(errorResponse);
  }
}
