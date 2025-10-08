import { Response } from 'express';

import { HTTP_MESSAGES, HTTP_STATUS } from '../constants/http.constants';
import { ApiResponse, BaseMeta, PaginationMeta } from '../interfaces/api-response.interface';

export class ResponseHelper {
  /**
   * Convert BigInt values to strings to make them JSON-serializable
   */
  private static convertBigIntsToString(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertBigIntsToString(item));
    }

    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          converted[key] = this.convertBigIntsToString(obj[key]);
        }
      }
      return converted;
    }

    return obj;
  }

  /**
   * Success response
   */
  static success<T>(
    res: Response,
    data?: T,
    message: string = HTTP_MESSAGES.SUCCESS,
    statusCode: number = HTTP_STATUS.OK
  ): Response<ApiResponse<T>> {
    // Convert BigInt values to strings to make them JSON-serializable
    const safeData = this.convertBigIntsToString(data);

    const response: ApiResponse<T> = {
      success: true,
      message,
      data: safeData as T,
      meta: this.createBaseMeta(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Created response
   */
  static created<T>(
    res: Response,
    data?: T,
    message: string = HTTP_MESSAGES.CREATED
  ): Response<ApiResponse<T>> {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Updated response
   */
  static updated<T>(
    res: Response,
    data?: T,
    message: string = HTTP_MESSAGES.UPDATED
  ): Response<ApiResponse<T>> {
    return this.success(res, data, message, HTTP_STATUS.OK);
  }

  /**
   * Deleted response
   */
  static deleted(res: Response, message: string = HTTP_MESSAGES.DELETED): Response<ApiResponse> {
    return this.success(res, null, message, HTTP_STATUS.OK);
  }

  /**
   * Paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = HTTP_MESSAGES.DATA_RETRIEVED
  ): Response<ApiResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      meta: this.createPaginationMeta(page, limit, total, totalPages),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Error response
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: any
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      error: process.env.NODE_ENV === 'production' ? undefined : error,
      meta: this.createBaseMeta(),
    };

    return res.status(statusCode).json(response);
  }

  // Private helper methods
  private static createBaseMeta(): BaseMeta {
    return {
      timestamp: new Date().toISOString(),
    };
  }

  private static createPaginationMeta(
    page: number,
    limit: number,
    total: number,
    totalPages: number
  ): PaginationMeta {
    return {
      timestamp: new Date().toISOString(),
      page,
      limit,
      total,
      totalPages,
    };
  }
}
