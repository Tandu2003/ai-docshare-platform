import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { DocumentsService } from '@/documents/documents.service';
import { GetShareLinksQueryDto } from '@/documents/dto/get-share-links-query.dto';
import { SetRatingDto } from '@/documents/dto/set-rating.dto';
import { ShareDocumentDto } from '@/documents/dto/share-document.dto';
import { ViewDocumentDto } from '@/documents/dto/view-document.dto';
import { AuthenticatedRequest } from '@/documents/interfaces';
import { DocumentCommentService } from '@/documents/services/document-comment.service';
import { DocumentSharingService } from '@/documents/services/document-sharing.service';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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

@ApiTags('Document Sharing')
@Controller('documents')
@ApiBearerAuth()
export class DocumentSharingController {
  constructor(
    private readonly sharingService: DocumentSharingService,
    private readonly commentService: DocumentCommentService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get(':documentId/rating')
  @ApiOperation({ summary: 'Get current user rating for a document' })
  async getUserRating(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.success(res, { rating: 0 }, 'Chưa đánh giá');
      }
      const rating = await this.commentService.getUserRating(
        documentId,
        userId,
      );
      return ResponseHelper.success(res, rating, 'Lấy đánh giá thành công');
    } catch {
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
      const rating = await this.commentService.setUserRating(
        documentId,
        userId,
        dto.rating,
      );
      return ResponseHelper.success(res, rating, 'Đã cập nhật đánh giá');
    } catch {
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
  ): Promise<FastifyReply> {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const shareLink = await this.sharingService.createOrUpdateShareLink(
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
  ): Promise<FastifyReply> {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      await this.sharingService.revokeShareLink(documentId, userId);
      return ResponseHelper.success(
        res,
        null,
        'Liên kết chia sẻ đã được thu hồi thành công',
      );
    } catch (error) {
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
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = (req as any).user?.id || null;

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
      const { referrer } = viewDocumentDto;

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

  @Get('share-links/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lấy lịch sử liên kết chia sẻ của người dùng hiện tại',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy lịch sử liên kết chia sẻ thành công',
  })
  async getMyShareLinks(
    @Query() query: GetShareLinksQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const result = await this.sharingService.getShareLinksHistory({
        ...query,
        createdById: userId,
      });

      return ResponseHelper.paginated(
        res,
        result.shareLinks,
        result.page,
        result.limit,
        result.total,
        'Lấy lịch sử liên kết chia sẻ thành công',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy lịch sử liên kết chia sẻ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
