import {
  BadRequestException,
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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { Public } from '@/auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '@/auth/guards/optional-jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { DocumentsService } from '@/documents/documents.service';
import { AuthenticatedRequest } from '@/documents/interfaces';
import { FilesService } from '@/files/files.service';

@ApiTags('Documents')
@Controller('documents')
export class DocumentAccessController {
  private readonly logger = new Logger(DocumentAccessController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService,
  ) {}

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
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
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

      const userId = req.user?.id;
      const userRole = req.user?.role?.name;
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : undefined;
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
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
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
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
      const userId = req.user?.id;
      const userRole = req.user?.role?.name;
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
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;

      const document = await this.documentsService.getDocumentById(
        documentId,
        userId,
        undefined,
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

  @Public()
  @Get('upload/allowed-types')
  @ApiOperation({ summary: 'Get allowed file types for upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Các loại tệp được phép đã được truy xuất thành công',
  })
  async getAllowedFileTypes(@Res() res: FastifyReply): Promise<FastifyReply> {
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

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('upload/view/:fileId')
  @ApiOperation({ summary: 'Increment file view count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lượt xem đã được tăng thành công',
  })
  async incrementViewCount(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      let ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';

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
