import { HTTP_MESSAGES, HTTP_STATUS } from '../constants/http.constants';
import {
  ApiResponse,
  BaseMeta,
  PaginationMeta,
} from '../interfaces/api-response.interface';
import { FastifyReply } from 'fastify';

export class ResponseHelper {
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
      return obj.map(item => this.convertBigIntsToString(item));
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

  static success<T>(
    res: FastifyReply,
    data?: T,
    message: string = HTTP_MESSAGES.SUCCESS,
    statusCode: number = HTTP_STATUS.OK,
  ): FastifyReply {
    // Convert BigInt values to strings to make them JSON-serializable
    const safeData = this.convertBigIntsToString(data);

    const response: ApiResponse<T> = {
      success: true,
      message,
      data: safeData as T,
      meta: this.createBaseMeta(),
    };

    return res.status(statusCode).send(response);
  }

  static created<T>(
    res: FastifyReply,
    data?: T,
    message: string = HTTP_MESSAGES.CREATED,
  ): FastifyReply {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static updated<T>(
    res: FastifyReply,
    data?: T,
    message: string = HTTP_MESSAGES.UPDATED,
  ): FastifyReply {
    return this.success(res, data, message, HTTP_STATUS.OK);
  }

  static deleted(
    res: FastifyReply,
    message: string = HTTP_MESSAGES.DELETED,
  ): FastifyReply {
    return this.success(res, null, message, HTTP_STATUS.OK);
  }

  static paginated<T>(
    res: FastifyReply,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = HTTP_MESSAGES.DATA_RETRIEVED,
  ): FastifyReply {
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      meta: this.createPaginationMeta(page, limit, total, totalPages),
    };

    return res.status(HTTP_STATUS.OK).send(response);
  }

  static error(
    res: FastifyReply,
    message: string = 'Đã xảy ra lỗi',
    statusCode: number = 500,
    error?: any,
  ): FastifyReply {
    const response: ApiResponse = {
      success: false,
      message,
      error: process.env.NODE_ENV === 'production' ? undefined : error,
      meta: this.createBaseMeta(),
    };

    return res.status(statusCode).send(response);
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
    totalPages: number,
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
