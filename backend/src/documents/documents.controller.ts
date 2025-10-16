import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ResponseHelper } from '../common/helpers/response.helper';
import { FilesService } from '../files/files.service';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DownloadDocumentDto } from './dto/download-document.dto';
import { ShareDocumentDto } from './dto/share-document.dto';
import { ViewDocumentDto } from './dto/view-document.dto';
import { CaslGuard, CheckPolicy } from '@/common/casl';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, CaslGuard)
@ApiBearerAuth()
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService,
  ) {}

  @Post('create')
  @CheckPolicy({ action: 'create', subject: 'Document' })
  @ApiOperation({ summary: 'Create a document from uploaded files' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tài liệu đã được tạo thành công',
  })
  async createDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
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

      return ResponseHelper.success(
        res,
        document,
        'Tài liệu đã được tạo thành công',
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
  @CheckPolicy({ action: 'download', subject: 'Document' })
  @ApiOperation({ summary: 'Download all files of a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tệp tài liệu tải xuống đã được chuẩn bị',
  })
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Body() downloadDto: DownloadDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.id; // Use optional chaining since user might not be authenticated

      // Extract IP address from request
      let ipAddress =
        downloadDto.ipAddress ||
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';

      // Clean up IPv6 mapped IPv4 addresses
      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.substring(7);
      }

      const userAgent =
        downloadDto.userAgent || req.get('User-Agent') || 'unknown';
      const referrer = downloadDto.referrer || req.get('Referer') || 'unknown';

      this.logger.log(
        `Download request for document ${documentId} from user ${userId}, IP: ${ipAddress}`,
      );

      const downloadResult = await this.documentsService.downloadDocument(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
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

  @Get('public')
  @ApiOperation({ summary: 'Get public documents with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu công khai đã được truy xuất thành công',
  })
  async getPublicDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      const result = await this.documentsService.getPublicDocuments(
        pageNum,
        limitNum,
        userId,
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
    @Res() res: Response,
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
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      const document = await this.documentsService.getDocumentById(
        documentId,
        userId,
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

  @Post(':documentId/share-link')
  @CheckPolicy({ action: 'share', subject: 'Document' })
  @ApiOperation({ summary: 'Create or update a share link for a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liên kết chia sẻ đã được cấu hình thành công',
  })
  async createShareLink(
    @Param('documentId') documentId: string,
    @Body() shareDocumentDto: ShareDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
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
  @CheckPolicy({ action: 'share', subject: 'Document' })
  @ApiOperation({ summary: 'Revoke a document share link' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liên kết chia sẻ đã được thu hồi thành công',
  })
  async revokeShareLink(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
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
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Get user ID if authenticated (optional)
      const userId = (req as any).user?.id || null;

      // Get IP address with multiple fallback methods
      let ipAddress =
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';

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

      const userAgent = req.get('User-Agent') || 'unknown';
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
  getAllowedFileTypes(@Res() res: Response) {
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
  @CheckPolicy({ action: 'delete', subject: 'Document' })
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu đã được xóa thành công',
  })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
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

  @Get('files/:fileId/secure-url')
  @CheckPolicy({ action: 'read', subject: 'File' })
  @ApiOperation({ summary: 'Get secure URL for file access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL tệp bảo mật đã được truy xuất thành công',
  })
  async getSecureFileUrl(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
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
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Get user ID if authenticated (optional)
      const userId = (req as any).user?.id || null;

      // Get IP address with multiple fallback methods
      let ipAddress =
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';

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

      const userAgent = req.get('User-Agent') || 'unknown';

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
