import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

export interface MultipartFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Injectable()
export class FastifyFileInterceptor implements NestInterceptor {
  constructor(
    private readonly fieldName: string,
    private readonly maxFiles: number = 10,
    private readonly maxFileSize: number = 100 * 1024 * 1024, // 100MB default
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.isMultipart()) {
      throw new BadRequestException('Request is not multipart');
    }

    const files: MultipartFile[] = [];
    const parts = request.parts();

    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === this.fieldName) {
          const chunks: Buffer[] = [];
          let size = 0;

          for await (const chunk of part.file) {
            size += chunk.length;
            if (size > this.maxFileSize) {
              throw new BadRequestException(
                `File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`,
              );
            }
            chunks.push(chunk);
          }

          const buffer = Buffer.concat(chunks);

          files.push({
            fieldname: part.fieldname,
            filename: part.filename,
            encoding: part.encoding,
            mimetype: part.mimetype,
            buffer,
            size: buffer.length,
            originalname: part.filename,
          });

          if (files.length >= this.maxFiles) {
            break;
          }
        }
      }
    }

    // Attach files to request
    (request as any).uploadedFiles = files;

    return next.handle();
  }
}

export function FastifyFilesInterceptor(
  fieldName: string,
  maxFiles: number = 10,
  options?: { maxFileSize?: number },
) {
  const maxFileSize = options?.maxFileSize ?? 100 * 1024 * 1024;

  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const request = context.switchToHttp().getRequest<FastifyRequest>();

      if (!request.isMultipart()) {
        throw new BadRequestException('Request is not multipart');
      }

      const files: MultipartFile[] = [];
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === fieldName) {
            const chunks: Buffer[] = [];
            let size = 0;

            for await (const chunk of part.file) {
              size += chunk.length;
              if (size > maxFileSize) {
                throw new BadRequestException(
                  `File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`,
                );
              }
              chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);

            files.push({
              fieldname: part.fieldname,
              filename: part.filename,
              encoding: part.encoding,
              mimetype: part.mimetype,
              buffer,
              size: buffer.length,
              originalname: part.filename,
            });

            if (files.length >= maxFiles) {
              break;
            }
          }
        }
      }

      // Attach files to request
      (request as any).uploadedFiles = files;

      return next.handle();
    }
  }

  return MixinInterceptor;
}
