import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ResponseHelper } from '../common/helpers/response.helper';
import { FilesService } from '../files/files.service';
import { DocumentsService } from './documents.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DownloadDocumentDto } from './dto/download-document.dto';
import { SetRatingDto } from './dto/set-rating.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ViewDocumentDto } from './dto/view-document.dto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Param,
  Patch,
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
import { FastifyReply, FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Documents')
@Controller('documents')
@ApiBearerAuth()
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a document from uploaded files' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tài liệu đã được tạo thành công',
  })
  async createDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const document = await this.documentsService.createDocument(
        createDocumentDto,
        userId,
      );

      const responseMessage = document.isApproved
        ? 'Tài liệu đã được tạo thành công'
        : 'Tài liệu đã được tạo, vui lòng chờ quản trị viên duyệt';

      return ResponseHelper.success(
        res,
        document,
        responseMessage,
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error('Error creating document:', error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi tạo tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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
  ) {
    try {
      const userId = req.user?.id; // Use optional chaining since user might not be authenticated

      // Extract IP address from request
      let ipAddress =
        downloadDto.ipAddress ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      // Clean up IPv6 mapped IPv4 addresses
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
  ) {
    try {
      const userId = req.user?.id;

      this.logger.log(
        `Getting download URL for document ${documentId} from user ${userId}`,
      );

      const downloadResult = await this.documentsService.getDownloadUrl(
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
      'Creates a pending download record. Call this BEFORE starting the actual download. Returns a downloadId that must be used to confirm the download later.',
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
  ) {
    try {
      const userId = req.user?.id;

      // Extract IP address from request
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

      const result = await this.documentsService.initDownload(
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
      'Confirms that a download has completed successfully. Call this AFTER the file has been downloaded. This increments the download count.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download đã được xác nhận',
  })
  async confirmDownload(
    @Param('downloadId') downloadId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;

      this.logger.log(`Confirming download ${downloadId} from user ${userId}`);

      const result = await this.documentsService.confirmDownload(
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
  ) {
    try {
      const userId = req.user?.id;

      this.logger.log(`Cancelling download ${downloadId} from user ${userId}`);

      const result = await this.documentsService.cancelDownload(
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
  ) {
    try {
      const userId = req.user?.id;

      // Extract IP address from request
      let ipAddress =
        downloadDto.ipAddress ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown';

      // Clean up IPv6 mapped IPv4 addresses
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

      // Use the new two-step process internally
      const initResult = await this.documentsService.initDownload(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
      );

      // Immediately confirm the download (legacy behavior)
      await this.documentsService.confirmDownload(
        initResult.downloadId,
        userId,
      );

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

  /**
   * Streaming download endpoint - streams file directly and tracks download via res.finish event
   * This is the recommended way to track downloads as it ensures the file was actually received by the client
   *
   * Flow:
   * 1. Validate permissions and deduct points (if applicable)
   * 2. Create pending download record
   * 3. Stream file to client
   * 4. On res.finish: mark download as successful, award uploader points
   * 5. On error/abort: mark download as failed
   */
  @UseGuards(JwtAuthGuard)
  @Get(':documentId/stream')
  @ApiOperation({
    summary: 'Stream download a document file',
    description:
      'Streams the document file directly to the client. Download is only counted when the stream completes successfully (res.finish). This prevents fake download counts and ensures fair point rewards.',
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
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Extract request metadata
      let ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }
      const userAgent = req.headers['user-agent'] || 'unknown';
      const referrer = req.headers['referer'] || 'unknown';

      this.logger.log(
        `Streaming download request for document ${documentId} from user ${userId}`,
      );

      // Prepare streaming download (validates permissions, deducts points, creates download record)
      const streamData = await this.documentsService.prepareStreamingDownload(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
        apiKey,
      );

      // Set response headers for file download
      res.header('Content-Type', streamData.mimeType);
      res.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(streamData.fileName)}"`,
      );
      res.header('Content-Length', streamData.fileSize.toString());
      res.header('X-Download-Id', streamData.downloadId);

      // Track when stream completes successfully (all bytes sent to client)
      res.raw.on('finish', () => {
        this.logger.log(
          `res.finish triggered for download ${streamData.downloadId}`,
        );
        void streamData.onStreamComplete();
      });

      // Track when stream is closed prematurely (client disconnected, network error, etc.)
      res.raw.on('close', () => {
        if (!res.raw.writableEnded) {
          // Stream was aborted before completion
          this.logger.log(
            `res.close (aborted) triggered for download ${streamData.downloadId}`,
          );
          void streamData.onStreamError();
        }
      });

      // Handle stream errors
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

      // Pipe the file stream to response
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

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @Public()
  @ApiOperation({
    summary: 'Search documents using hybrid AI search',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Kết quả tìm kiếm tài liệu',
  })
  async searchDocuments(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('method') method: string = 'hybrid',
    @Query('categoryId') categoryId: string | undefined,
    @Query('tags') tags: string | undefined,
    @Query('language') language: string | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('sortOrder') sortOrder: string | undefined,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      if (!query || query.trim().length === 0) {
        return ResponseHelper.error(
          res,
          'Query không được để trống',
          HttpStatus.BAD_REQUEST,
        );
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
      const normalizedMethod = method?.toLowerCase();

      if (normalizedMethod && normalizedMethod !== 'hybrid') {
        this.logger.warn(
          `Search method "${method}" is deprecated. Falling back to hybrid search.`,
        );
      }

      // Get user ID and role if authenticated
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role?.name;

      const tagsArray = tags ? tags.split(',').map(t => t.trim()) : undefined;

      // Validate sortBy - only allow specific values
      const allowedSortBy = [
        'createdAt',
        'downloadCount',
        'viewCount',
        'averageRating',
        'title',
        'relevance',
      ];
      const validSortBy = allowedSortBy.includes(sortBy || '')
        ? sortBy
        : undefined;

      // Validate sortOrder
      const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      const result = await this.documentsService.searchDocuments(
        query.trim(),
        pageNum,
        limitNum,
        userId,
        userRole,
        {
          categoryId,
          tags: tagsArray,
          language,
          sortBy: validSortBy,
          sortOrder: validSortOrder,
        },
      );

      return ResponseHelper.success(
        res,
        result,
        'Tìm kiếm tài liệu thành công',
      );
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi tìm kiếm tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public documents with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu công khai đã được truy xuất thành công',
  })
  async getPublicDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('categoryId') categoryId: string | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('sortOrder') sortOrder: string | undefined,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

      // Get user ID and role if authenticated
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role?.name;

      // Validate sortBy - only allow specific values
      const allowedSortBy = [
        'createdAt',
        'downloadCount',
        'viewCount',
        'averageRating',
        'title',
      ];
      const validSortBy = allowedSortBy.includes(sortBy || '')
        ? sortBy
        : 'createdAt';

      // Validate sortOrder
      const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      const result = await this.documentsService.getPublicDocuments(
        pageNum,
        limitNum,
        userId,
        userRole,
        {
          categoryId,
          sortBy: validSortBy,
          sortOrder: validSortOrder,
        },
      );

      return ResponseHelper.success(
        res,
        result,
        'Tài liệu công khai đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error('Error getting public documents:', error);
      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi truy xuất tài liệu công khai',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('my')
  @ApiOperation({ summary: 'Get user documents with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu người dùng đã được truy xuất thành công',
  })
  async getUserDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user.id;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    try {
      const documents = await this.documentsService.getUserDocuments(
        userId,
        pageNum,
        limitNum,
      );

      return ResponseHelper.success(
        res,
        documents,
        'Tài liệu đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error('Error getting user documents:', error);
      return ResponseHelper.error(
        res,
        'Không thể lấy tài liệu người dùng',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chi tiết tài liệu đã được truy xuất thành công',
  })
  async getDocumentById(
    @Param('documentId') documentId: string,
    @Query('apiKey') apiKey: string | undefined,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      const document = await this.documentsService.getDocumentById(
        documentId,
        userId,
        undefined, // shareToken
        apiKey,
      );

      return ResponseHelper.success(
        res,
        document,
        'Tài liệu đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error(`Error getting document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Comments endpoints
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':documentId/comments')
  @ApiOperation({ summary: 'Get comments for a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Danh sách bình luận' })
  async getComments(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      const comments = await this.documentsService.getComments(
        documentId,
        userId,
      );
      return ResponseHelper.success(res, comments, 'Lấy bình luận thành công');
    } catch (error) {
      this.logger.error(
        `Error getting comments for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể lấy bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add a comment to a document' })
  async addComment(
    @Param('documentId') documentId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const comment = await this.documentsService.addComment(
        documentId,
        userId,
        dto,
      );
      return ResponseHelper.success(res, comment, 'Đã thêm bình luận');
    } catch (error) {
      this.logger.error(
        `Error adding comment for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể thêm bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Like a comment' })
  async likeComment(
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const updated = await this.documentsService.likeComment(
        documentId,
        commentId,
        userId,
      );
      return ResponseHelper.success(res, updated, 'Đã thích bình luận');
    } catch (error) {
      this.logger.error(
        `Error liking comment ${commentId} for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể thích bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Edit a comment' })
  async editComment(
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const updated = await this.documentsService.editComment(
        documentId,
        commentId,
        userId,
        dto,
      );
      return ResponseHelper.success(res, updated, 'Đã sửa bình luận');
    } catch (error) {
      this.logger.error(
        `Error editing comment ${commentId} for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể sửa bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':documentId/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }
      await this.documentsService.deleteComment(documentId, commentId, userId);
      return ResponseHelper.success(res, null, 'Đã xóa bình luận');
    } catch (error) {
      this.logger.error(
        `Error deleting comment ${commentId} for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể xóa bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Ratings endpoints
   */
  @Get(':documentId/rating')
  @ApiOperation({ summary: 'Get current user rating for a document' })
  async getUserRating(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.success(res, { rating: 0 }, 'Chưa đánh giá');
      }
      const rating = await this.documentsService.getUserRating(
        documentId,
        userId,
      );
      return ResponseHelper.success(res, rating, 'Lấy đánh giá thành công');
    } catch (error) {
      this.logger.error(
        `Error getting rating for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể lấy đánh giá',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/rating')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set current user rating for a document' })
  async setUserRating(
    @Param('documentId') documentId: string,
    @Body() dto: SetRatingDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const rating = await this.documentsService.setUserRating(
        documentId,
        userId,
        dto.rating,
      );
      return ResponseHelper.success(res, rating, 'Đã cập nhật đánh giá');
    } catch (error) {
      this.logger.error(
        `Error setting rating for document ${documentId}:`,
        error,
      );
      return ResponseHelper.error(
        res,
        'Không thể cập nhật đánh giá',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/share-link')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create or update a share link for a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liên kết chia sẻ đã được cấu hình thành công',
  })
  async createShareLink(
    @Param('documentId') documentId: string,
    @Body() shareDocumentDto: ShareDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const shareLink = await this.documentsService.createOrUpdateShareLink(
        documentId,
        userId,
        shareDocumentDto,
      );
      return ResponseHelper.success(
        res,
        shareLink,
        'Liên kết chia sẻ đã được cấu hình thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error configuring share link for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }
      return ResponseHelper.error(
        res,
        'Không thể cấu hình liên kết chia sẻ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':documentId/share-link')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke a document share link' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liên kết chia sẻ đã được thu hồi thành công',
  })
  async revokeShareLink(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      await this.documentsService.revokeShareLink(documentId, userId);
      return ResponseHelper.success(
        res,
        null,
        'Liên kết chia sẻ đã được thu hồi thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error revoking share link for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }
      return ResponseHelper.error(
        res,
        'Không thể thu hồi liên kết chia sẻ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/view')
  @ApiOperation({ summary: 'Track document view' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lượt xem tài liệu đã được theo dõi thành công',
  })
  async viewDocument(
    @Param('documentId') documentId: string,
    @Body() viewDocumentDto: ViewDocumentDto,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      // Get user ID if authenticated (optional)
      const userId = (req as any).user?.id || null;

      // Get IP address with multiple fallback methods
      let ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

      // Handle x-forwarded-for header (can be array)
      if (!ipAddress || ipAddress === 'unknown') {
        const forwardedFor = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];

        if (forwardedFor) {
          ipAddress = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0].trim();
        } else if (realIp) {
          ipAddress = Array.isArray(realIp) ? realIp[0] : realIp;
        }
      }

      const userAgent = req.headers['user-agent'] || 'unknown';
      const { referrer } = viewDocumentDto;

      this.logger.log(
        `Tracking view for document ${documentId}: userId=${userId}, ip=${ipAddress}`,
      );

      const result = await this.documentsService.viewDocument(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
      );

      return ResponseHelper.success(
        res,
        result,
        'Lượt xem tài liệu đã được theo dõi thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error tracking view for document ${documentId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể theo dõi lượt xem tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('upload/allowed-types')
  @ApiOperation({ summary: 'Get allowed file types for upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Các loại tệp được phép đã được truy xuất thành công',
  })
  getAllowedFileTypes(@Res() res: FastifyReply) {
    try {
      const allowedTypes = this.filesService.getAllowedTypes();
      return ResponseHelper.success(
        res,
        allowedTypes,
        'Các loại tệp được phép đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error('Error getting allowed file types:', error);
      return ResponseHelper.error(
        res,
        'Không thể lấy các loại tệp được phép',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':documentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu đã được xóa thành công',
  })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.documentsService.deleteDocument(documentId, userId);

      return ResponseHelper.success(
        res,
        null,
        'Tài liệu đã được xóa thành công',
      );
    } catch (error) {
      this.logger.error(`Error deleting document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể xóa tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':documentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a document (owner or admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu đã được cập nhật thành công',
  })
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role?.name;

      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const updatedDocument = await this.documentsService.updateDocument(
        documentId,
        userId,
        updateDocumentDto,
        userRole,
      );

      return ResponseHelper.success(
        res,
        updatedDocument,
        'Tài liệu đã được cập nhật thành công',
      );
    } catch (error) {
      this.logger.error(`Error updating document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể cập nhật tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files/:fileId/secure-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get secure URL for file access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL tệp bảo mật đã được truy xuất thành công',
  })
  async getSecureFileUrl(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const secureUrl = await this.filesService.getSecureFileUrl(
        fileId,
        userId,
      );

      return ResponseHelper.success(
        res,
        { secureUrl },
        'URL tệp bảo mật đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error(`Error getting secure URL for file ${fileId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy URL tệp bảo mật',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload/view/:fileId')
  @ApiOperation({ summary: 'Increment file view count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lượt xem đã được tăng thành công',
  })
  async incrementViewCount(
    @Param('fileId') fileId: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      // Get user ID if authenticated (optional)
      const userId = (req as any).user?.id || null;

      // Get IP address with multiple fallback methods
      let ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

      // Handle x-forwarded-for header (can be array)
      if (!ipAddress || ipAddress === 'unknown') {
        const forwardedFor = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];

        if (forwardedFor) {
          ipAddress = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0].trim();
        } else if (realIp) {
          ipAddress = Array.isArray(realIp) ? realIp[0] : realIp;
        }
      }

      const userAgent = req.headers['user-agent'] || 'unknown';

      this.logger.log(
        `Tracking view for file ${fileId}: userId=${userId}, ip=${ipAddress}`,
      );

      await this.filesService.incrementViewCount(
        fileId,
        userId,
        ipAddress,
        userAgent,
      );

      return ResponseHelper.success(
        res,
        null,
        'Lượt xem đã được tăng thành công',
      );
    } catch (error) {
      this.logger.error(
        `Error incrementing view count for file ${fileId}:`,
        error,
      );

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể tăng lượt xem',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
