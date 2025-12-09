import { Public } from '@/auth/decorators/public.decorator';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/auth/guards/optional-jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { PreviewInitializationService } from '@/preview/preview-initialization.service';
import { PreviewQueueService } from '@/preview/preview-queue.service';
import { PreviewService } from '@/preview/preview.service';
import { SecureDocumentService } from '@/preview/secure-document.service';
import {
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

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Preview')
@Controller('preview')
export class PreviewController {
  private readonly logger = new Logger(PreviewController.name);

  constructor(
    private readonly previewService: PreviewService,
    private readonly previewQueueService: PreviewQueueService,
    private readonly secureDocumentService: SecureDocumentService,
    private readonly previewInitializationService: PreviewInitializationService,
  ) {}

  @Get(':documentId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get preview images for a document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiQuery({
    name: 'apiKey',
    required: false,
    description: 'Share link API key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview images returned',
  })
  async getDocumentPreviews(
    @Param('documentId') documentId: string,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;

      // Validate access
      const hasAccess = await this.secureDocumentService.validateDocumentAccess(
        documentId,
        userId,
        apiKey,
        'preview', // Only need preview access level
      );

      if (!hasAccess.allowed) {
        return ResponseHelper.error(
          res,
          hasAccess.reason || 'Không có quyền truy cập',
          HttpStatus.FORBIDDEN,
        );
      }

      // Get previews
      const previews =
        await this.previewService.getDocumentPreviews(documentId);

      return ResponseHelper.success(res, {
        documentId,
        previews,
        count: previews.length,
        expiresIn: 30, // seconds
      });
    } catch (error) {
      this.logger.error(
        `Error getting previews for document ${documentId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, error.message, HttpStatus.NOT_FOUND);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':documentId/page/:pageNumber')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a specific preview page' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'pageNumber', description: 'Page number (1-based)' })
  @ApiQuery({
    name: 'apiKey',
    required: false,
    description: 'Share link API key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview image URL returned',
  })
  async getPreviewPage(
    @Param('documentId') documentId: string,
    @Param('pageNumber', ParseIntPipe) pageNumber: number,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;

      // Validate access
      const hasAccess = await this.secureDocumentService.validateDocumentAccess(
        documentId,
        userId,
        apiKey,
        'preview',
      );

      if (!hasAccess.allowed) {
        return ResponseHelper.error(
          res,
          hasAccess.reason || 'Không có quyền truy cập',
          HttpStatus.FORBIDDEN,
        );
      }

      // Get preview with short-lived URL
      const preview = await this.previewService.getPreviewImage(
        documentId,
        pageNumber,
      );

      return ResponseHelper.success(res, preview);
    } catch (error) {
      this.logger.error(
        `Error getting preview page ${pageNumber} for document ${documentId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, error.message, HttpStatus.NOT_FOUND);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':documentId/stream/:pageNumber')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Stream preview image directly' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'pageNumber', description: 'Page number (1-based)' })
  @ApiQuery({
    name: 'apiKey',
    required: false,
    description: 'Share link API key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview image streamed',
  })
  async streamPreviewImage(
    @Param('documentId') documentId: string,
    @Param('pageNumber', ParseIntPipe) pageNumber: number,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;

      // Validate access
      const hasAccess = await this.secureDocumentService.validateDocumentAccess(
        documentId,
        userId,
        apiKey,
        'preview',
      );

      if (!hasAccess.allowed) {
        res.status(HttpStatus.FORBIDDEN).send(hasAccess.reason);
        return;
      }

      // Stream the preview image
      const { stream, mimeType, contentLength } =
        await this.previewService.streamPreviewImage(documentId, pageNumber);

      // Set headers
      res.header('Content-Type', mimeType);
      if (contentLength) {
        res.header('Content-Length', contentLength.toString());
      }
      res.header('Cache-Control', 'private, max-age=300'); // 5 minutes cache

      // Send stream to response
      return res.send(stream);
    } catch (error) {
      this.logger.error(
        `Error streaming preview for document ${documentId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).send('Preview not found');
        return;
      }

      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Error streaming preview');
    }
  }

  @Get(':documentId/status')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get preview generation status' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview status returned',
  })
  async getPreviewStatus(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const status = await this.previewService.getPreviewStatus(documentId);
      return ResponseHelper.success(res, status);
    } catch (error) {
      this.logger.error(
        `Error getting preview status for document ${documentId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, error.message, HttpStatus.NOT_FOUND);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy trạng thái preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate previews for a document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview generation started',
  })
  async generatePreviews(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Unauthorized',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Validate ownership
      const isOwner = await this.secureDocumentService.isDocumentOwner(
        documentId,
        userId,
      );

      if (!isOwner) {
        return ResponseHelper.error(
          res,
          'Chỉ chủ sở hữu mới có thể tạo preview',
          HttpStatus.FORBIDDEN,
        );
      }

      // Generate previews
      const result = await this.previewService.generatePreviews(documentId);

      return ResponseHelper.success(res, result);
    } catch (error) {
      this.logger.error(
        `Error generating previews for document ${documentId}:`,
        error,
      );

      return ResponseHelper.error(
        res,
        'Không thể tạo preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate previews for a document' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview regeneration started',
  })
  async regeneratePreviews(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Unauthorized',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Validate ownership
      const isOwner = await this.secureDocumentService.isDocumentOwner(
        documentId,
        userId,
      );

      if (!isOwner) {
        return ResponseHelper.error(
          res,
          'Chỉ chủ sở hữu mới có thể tạo lại preview',
          HttpStatus.FORBIDDEN,
        );
      }

      // Regenerate previews
      const result = await this.previewService.regeneratePreviews(documentId);

      return ResponseHelper.success(res, result);
    } catch (error) {
      this.logger.error(
        `Error regenerating previews for document ${documentId}:`,
        error,
      );

      return ResponseHelper.error(
        res,
        'Không thể tạo lại preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get preview initialization status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview status returned',
  })
  async getAdminPreviewStatus(@Res() res: FastifyReply) {
    try {
      const status =
        await this.previewInitializationService.getInitializationStatus();

      return ResponseHelper.success(res, status);
    } catch (error) {
      this.logger.error('Error getting preview status:', error);
      return ResponseHelper.error(
        res,
        'Không thể lấy trạng thái preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin/initialize')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initialize previews for all documents without previews (Admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview initialization started',
  })
  initializePreviews(@Res() res: FastifyReply) {
    try {
      // Start initialization in background
      void this.previewInitializationService
        .initializeMissingPreviews()
        .catch(error => {
          this.logger.error('Background preview initialization failed:', error);
        });

      return ResponseHelper.success(res, {
        message: 'Preview initialization started in background',
      });
    } catch (error) {
      this.logger.error('Error starting preview initialization:', error);
      return ResponseHelper.error(
        res,
        'Không thể bắt đầu khởi tạo preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin/regenerate-failed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate all failed previews (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Failed previews regeneration result',
  })
  async regenerateFailedPreviews(@Res() res: FastifyReply) {
    try {
      const result =
        await this.previewInitializationService.regenerateFailedPreviews();

      return ResponseHelper.success(res, {
        message: 'Regeneration completed',
        ...result,
      });
    } catch (error) {
      this.logger.error('Error regenerating failed previews:', error);
      return ResponseHelper.error(
        res,
        'Không thể tạo lại preview thất bại',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('admin/regenerate-all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Force regenerate ALL document previews, including completed ones (Admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All previews regeneration started',
  })
  regenerateAllPreviews(@Res() res: FastifyReply) {
    try {
      // Start regeneration in background
      void this.previewInitializationService
        .regenerateAllPreviews()
        .catch(error => {
          this.logger.error('Background preview regeneration failed:', error);
        });

      return ResponseHelper.success(res, {
        message:
          'Preview regeneration started in background. Check logs for progress.',
      });
    } catch (error) {
      this.logger.error('Error starting preview regeneration:', error);
      return ResponseHelper.error(
        res,
        'Không thể bắt đầu tạo lại preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test/regenerate-all')
  @Public()
  @ApiOperation({ summary: 'TEST: Trigger regenerate all previews (no auth)' })
  testRegenerateAll(@Res() res: FastifyReply) {
    try {
      this.logger.log('TEST: Starting regenerate all previews');
      void this.previewInitializationService
        .regenerateAllPreviews()
        .catch(error => {
          this.logger.error('Background preview regeneration failed:', error);
        });

      return ResponseHelper.success(res, {
        message:
          'TEST: Preview regeneration started in background. Check logs for progress.',
      });
    } catch (error) {
      this.logger.error('Error starting preview regeneration:', error);
      return ResponseHelper.error(
        res,
        'Không thể bắt đầu tạo lại preview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/queue-status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get preview queue status (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue status returned',
  })
  getQueueStatus(@Res() res: FastifyReply) {
    const status = this.previewQueueService.getStatus();
    return ResponseHelper.success(res, status);
  }
}
