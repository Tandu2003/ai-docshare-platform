import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/auth/guards/optional-jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { SecureDocumentService } from '@/preview/secure-document.service';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Secure Document Access')
@Controller('secure')
export class SecureDocumentController {
  private readonly logger = new Logger(SecureDocumentController.name);

  constructor(private readonly secureDocumentService: SecureDocumentService) {}

  /**
   * Get a secure, short-lived download URL (30 seconds)
   * This URL should be used immediately to start the download
   */
  @Post('download/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get secure download URL (30 second expiry)',
    description:
      'Returns a short-lived signed URL that expires in 30 seconds. Client must use this URL immediately to start the download.',
  })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({
    name: 'apiKey',
    required: false,
    description: 'Share link API key for access validation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Secure download URL generated',
  })
  async getSecureDownloadUrl(
    @Param('documentId') documentId: string,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const downloadInfo =
        await this.secureDocumentService.getSecureDownloadUrl(
          documentId,
          userId,
          apiKey,
        );

      return ResponseHelper.success(res, {
        ...downloadInfo,
        message:
          'URL hết hạn sau 30 giây. Vui lòng bắt đầu tải xuống ngay lập tức.',
      });
    } catch (error) {
      this.logger.error(
        `Error getting secure download URL for ${documentId}:`,
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        return ResponseHelper.error(
          res,
          error.message,
          error instanceof NotFoundException
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_REQUEST,
        );
      }

      return ResponseHelper.error(
        res,
        'Không thể tạo liên kết tải xuống',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate a one-time download token
   * Token valid for 30 seconds
   */
  @Post('token/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate one-time download token (30 second expiry)',
    description:
      'Generates a single-use token for downloading. Token expires in 30 seconds.',
  })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download token generated',
  })
  async generateDownloadToken(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Authentication required',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Validate access first
      const access = await this.secureDocumentService.validateDocumentAccess(
        documentId,
        userId,
        undefined,
        'download',
      );

      if (!access.allowed) {
        return ResponseHelper.error(
          res,
          access.reason || 'Access denied',
          HttpStatus.FORBIDDEN,
        );
      }

      const tokenInfo = await this.secureDocumentService.generateDownloadToken(
        documentId,
        userId,
      );

      return ResponseHelper.success(res, {
        ...tokenInfo,
        message:
          'Token hết hạn sau 30 giây. Sử dụng token này để tải xuống tài liệu.',
      });
    } catch (error) {
      this.logger.error(
        `Error generating download token for ${documentId}:`,
        error,
      );

      return ResponseHelper.error(
        res,
        'Không thể tạo token tải xuống',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Stream document file directly using token
   * No URL exposed - file streams through backend
   */
  @Get('stream/:token')
  @ApiOperation({
    summary: 'Stream document using download token',
    description:
      'Streams the document file directly through the backend. No storage URL is exposed.',
  })
  @ApiParam({ name: 'token', description: 'Download token' })
  @ApiQuery({
    name: 'fileIndex',
    required: false,
    description: 'File index for multi-file documents (default: 0)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document file streamed',
  })
  async streamWithToken(
    @Param('token') token: string,
    @Query('fileIndex') fileIndexStr: string | undefined,
    @Res() res: FastifyReply,
  ) {
    try {
      // Validate token
      const tokenInfo = this.secureDocumentService.validateDownloadToken(token);

      if (!tokenInfo.valid || !tokenInfo.documentId) {
        res
          .status(HttpStatus.UNAUTHORIZED)
          .send(tokenInfo.reason || 'Invalid token');
        return;
      }

      const fileIndex = fileIndexStr ? parseInt(fileIndexStr, 10) : 0;

      // Stream the file
      const { stream, fileName, mimeType, fileSize } =
        await this.secureDocumentService.streamDocumentFile(
          tokenInfo.documentId,
          fileIndex,
          tokenInfo.userId,
        );

      // Set response headers
      res.header('Content-Type', mimeType);
      res.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      if (fileSize > 0) {
        res.header('Content-Length', fileSize.toString());
      }

      // Stream to response
      return res.send(stream);
    } catch (error) {
      this.logger.error(`Error streaming with token:`, error);

      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).send('File not found');
        return;
      }

      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).send(error.message);
        return;
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error streaming file');
    }
  }

  /**
   * Stream document file directly (authenticated, no token needed)
   */
  @Get('stream/document/:documentId/:fileIndex')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stream document file directly (authenticated)',
    description:
      'Streams document file through backend. Requires authentication.',
  })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({
    name: 'fileIndex',
    description: 'File index (0-based)',
  })
  @ApiQuery({
    name: 'apiKey',
    required: false,
    description: 'Share link API key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document file streamed',
  })
  async streamDocumentFile(
    @Param('documentId') documentId: string,
    @Param('fileIndex', ParseIntPipe) fileIndex: number,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(HttpStatus.UNAUTHORIZED).send('Authentication required');
        return;
      }

      // Stream the file
      const { stream, fileName, mimeType, fileSize } =
        await this.secureDocumentService.streamDocumentFile(
          documentId,
          fileIndex,
          userId,
          apiKey,
        );

      // Set response headers
      res.header('Content-Type', mimeType);
      res.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`,
      );
      if (fileSize > 0) {
        res.header('Content-Length', fileSize.toString());
      }

      // Stream to response
      return res.send(stream);
    } catch (error) {
      this.logger.error(`Error streaming document ${documentId}:`, error);

      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).send('File not found');
        return;
      }

      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).send(error.message);
        return;
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error streaming file');
    }
  }

  /**
   * Validate document access without downloading
   */
  @Get('access/:documentId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Check document access permissions',
    description: 'Checks if the current user can access the document.',
  })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({
    name: 'apiKey',
    required: false,
    description: 'Share link API key',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    description: 'Access level to check: preview, download, full',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access check result',
  })
  async checkAccess(
    @Param('documentId') documentId: string,
    @Query('apiKey') apiKey: string | undefined,
    @Query('level') level: 'preview' | 'download' | 'full' | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      const accessLevel = level || 'preview';

      const access = await this.secureDocumentService.validateDocumentAccess(
        documentId,
        userId,
        apiKey,
        accessLevel,
      );

      return ResponseHelper.success(res, {
        allowed: access.allowed,
        accessType: access.accessType,
        reason: access.reason,
        level: accessLevel,
      });
    } catch (error) {
      this.logger.error(`Error checking access for ${documentId}:`, error);

      return ResponseHelper.error(
        res,
        'Không thể kiểm tra quyền truy cập',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
