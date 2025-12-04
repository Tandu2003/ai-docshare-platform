import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { DocumentsService } from '@/documents/documents.service';
import { DownloadDocumentDto } from '@/documents/dto/download-document.dto';
import { AuthenticatedRequest } from '@/documents/interfaces';
import { DocumentDownloadService } from '@/documents/services/document-download.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

@ApiTags('Document Downloads')
@Controller('documents')
@ApiBearerAuth()
export class DocumentDownloadController {
  private readonly logger = new Logger(DocumentDownloadController.name);

  constructor(
    private readonly downloadService: DocumentDownloadService,
    private readonly documentsService: DocumentsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post(':documentId/download')
  @ApiOperation({ summary: 'Download all files of a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tệp tài liệu tải xuống đã được chuẩn bị',
  })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Body() downloadDto: DownloadDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      let ipAddress =
        downloadDto.ipAddress ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }

      const userAgent =
        downloadDto.userAgent || req.headers['user-agent'] || 'unknown';
      const referrer =
        downloadDto.referrer || req.headers['referer'] || 'unknown';

      this.logger.log(
        `Download request for document ${documentId} from user ${userId}, IP: ${ipAddress}`,
      );

      const downloadResult = await this.documentsService.downloadDocument(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
        downloadDto.apiKey,
      );

      return ResponseHelper.success(
        res,
        downloadResult,
        'Tải xuống tài liệu đã được chuẩn bị thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error preparing download for document ${documentId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể chuẩn bị tải xuống tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':documentId/download-url')
  @ApiOperation({ summary: 'Get download URL for a document without tracking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL tải xuống đã được tạo',
  })
  async getDownloadUrl(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      this.logger.log(
        `Getting download URL for document ${documentId} from user ${userId}`,
      );

      const downloadResult = await this.downloadService.getDownloadUrl(
        documentId,
        userId,
      );

      return ResponseHelper.success(
        res,
        downloadResult,
        'URL tải xuống đã được tạo thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error getting download URL for document ${documentId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể tạo URL tải xuống',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':documentId/init-download')
  @ApiOperation({
    summary: 'Initialize a download',
    description:
      'Creates a pending download record. Call this BEFORE starting the actual download.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download đã được khởi tạo',
  })
  async initDownload(
    @Param('documentId') documentId: string,
    @Body() downloadDto: DownloadDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      let ipAddress =
        downloadDto.ipAddress ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }

      const userAgent =
        downloadDto.userAgent || req.headers['user-agent'] || 'unknown';
      const referrer =
        downloadDto.referrer || req.headers['referer'] || 'unknown';

      this.logger.log(
        `Init download for document ${documentId} from user ${userId}, IP: ${ipAddress}`,
      );

      const result = await this.downloadService.initDownload(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
      );

      return ResponseHelper.success(res, result, 'Download đã được khởi tạo');
    } catch (error) {
      this.logger.error(
        `Error initializing download for document ${documentId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể khởi tạo download',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-download/:downloadId')
  @ApiOperation({
    summary: 'Confirm a download',
    description:
      'Confirms that a download has completed successfully. This increments the download count.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download đã được xác nhận',
  })
  async confirmDownload(
    @Param('downloadId') downloadId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      this.logger.log(`Confirming download ${downloadId} from user ${userId}`);

      const result = await this.downloadService.confirmDownload(
        downloadId,
        userId,
      );

      return ResponseHelper.success(res, result, result.message);
    } catch (error) {
      this.logger.error(`Error confirming download ${downloadId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể xác nhận download',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel-download/:downloadId')
  @ApiOperation({
    summary: 'Cancel a pending download',
    description:
      'Cancels a pending download. Call this if the download fails or is cancelled by the user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download đã được hủy',
  })
  async cancelDownload(
    @Param('downloadId') downloadId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      this.logger.log(`Cancelling download ${downloadId} from user ${userId}`);

      const result = await this.downloadService.cancelDownload(
        downloadId,
        userId,
      );

      return ResponseHelper.success(res, result, 'Download đã được hủy');
    } catch (error) {
      this.logger.error(`Error cancelling download ${downloadId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể hủy download',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':documentId/track-download')
  @ApiOperation({
    summary: 'Track download completion (Legacy)',
    description:
      'Legacy endpoint. Use init-download + confirm-download for better tracking.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download đã được track thành công',
  })
  async trackDownload(
    @Param('documentId') documentId: string,
    @Body() downloadDto: DownloadDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      let ipAddress =
        downloadDto.ipAddress ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }

      const userAgent =
        downloadDto.userAgent || req.headers['user-agent'] || 'unknown';
      const referrer =
        downloadDto.referrer || req.headers['referer'] || 'unknown';

      this.logger.log(
        `Legacy track download for document ${documentId} from user ${userId}, IP: ${ipAddress}`,
      );

      const initResult = await this.downloadService.initDownload(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
      );

      await this.downloadService.confirmDownload(initResult.downloadId, userId);

      return ResponseHelper.success(
        res,
        { success: true },
        'Download đã được track thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error tracking download for document ${documentId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể track download',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':documentId/stream')
  @ApiOperation({
    summary: 'Stream download a document file',
    description:
      'Streams the document file directly to the client. Download is only counted when the stream completes successfully.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File streamed successfully',
  })
  async streamDownload(
    @Param('documentId') documentId: string,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      let ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }
      const userAgent = req.headers['user-agent'] || 'unknown';
      const referrer = req.headers['referer'] || 'unknown';

      this.logger.log(
        `Streaming download request for document ${documentId} from user ${userId}`,
      );

      const streamData = await this.downloadService.prepareStreamingDownload(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
        apiKey,
      );

      res.header('Content-Type', streamData.mimeType);
      res.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(streamData.fileName)}"`,
      );
      res.header('Content-Length', streamData.fileSize.toString());
      res.header('X-Download-Id', streamData.downloadId);

      res.raw.on('finish', () => {
        this.logger.log(
          `res.finish triggered for download ${streamData.downloadId}`,
        );
        void streamData.onStreamComplete();
      });

      res.raw.on('close', () => {
        if (!res.raw.writableEnded) {
          this.logger.log(
            `res.close (aborted) triggered for download ${streamData.downloadId}`,
          );
          void streamData.onStreamError();
        }
      });

      streamData.fileStream.on('error', error => {
        this.logger.error(
          `Stream error for download ${streamData.downloadId}: ${error.message}`,
        );
        void streamData.onStreamError();
        if (!res.sent) {
          void ResponseHelper.error(
            res,
            'Lỗi khi stream file',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      });

      return res.send(streamData.fileStream);
    } catch (error) {
      this.logger.error(
        `Error streaming download for document ${documentId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể tải xuống tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
