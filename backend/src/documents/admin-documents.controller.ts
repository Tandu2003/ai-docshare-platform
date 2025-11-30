import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnly, RoleGuard } from '../common/authorization';
import { ResponseHelper } from '../common/helpers/response.helper';
import { DocumentsService } from './documents.service';
import { ApproveDocumentDto } from './dto/approve-document.dto';
import { ModerationQueueQueryDto } from './dto/moderation-queue.dto';
import { RejectDocumentDto } from './dto/reject-document.dto';
import {
  BadRequestException,
  Body,
  Controller,
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
import { DocumentModerationStatus } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
  };
}

@ApiTags('Admin Documents')
@ApiBearerAuth()
@Controller('admin/documents')
@AdminOnly()
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Danh sách tài liệu chờ duyệt' })
  async getModerationQueue(
    @Query() query: ModerationQueueQueryDto,
    @Res() res: FastifyReply,
  ) {
    try {
      const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
      const limit = query.limit
        ? Math.min(50, Math.max(1, parseInt(query.limit, 10)))
        : 10;

      const result = await this.documentsService.getModerationQueue({
        page,
        limit,
        categoryId: query.categoryId,
        uploaderId: query.uploaderId,
        status: query.status ?? DocumentModerationStatus.PENDING,
        sort: query.sort,
        order: query.order,
      });

      return ResponseHelper.success(
        res,
        result,
        'Lấy danh sách tài liệu chờ duyệt thành công',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy danh sách tài liệu chờ duyệt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Chi tiết tài liệu để kiểm duyệt' })
  async getDocumentForModeration(
    @Param('documentId') documentId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const document =
        await this.documentsService.getDocumentForModeration(documentId);
      return ResponseHelper.success(
        res,
        document,
        'Lấy chi tiết tài liệu thành công',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy chi tiết tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/approve')
  @ApiOperation({ summary: 'Duyệt và xuất bản tài liệu' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tài liệu đã được duyệt' })
  async approveDocument(
    @Param('documentId') documentId: string,
    @Body() body: ApproveDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const adminId = req.user?.id;
      const document = await this.documentsService.approveDocumentModeration(
        documentId,
        adminId,
        body,
      );

      return ResponseHelper.success(
        res,
        document,
        'Tài liệu đã được duyệt thành công',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể duyệt tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/reject')
  @ApiOperation({ summary: 'Từ chối tài liệu' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu đã bị từ chối',
  })
  async rejectDocument(
    @Param('documentId') documentId: string,
    @Body() body: RejectDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const adminId = req.user?.id;
      const document = await this.documentsService.rejectDocumentModeration(
        documentId,
        adminId,
        body,
      );

      return ResponseHelper.success(res, document, 'Tài liệu đã bị từ chối');
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể từ chối tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':documentId/analyze')
  @ApiOperation({ summary: 'Phân tích AI hỗ trợ kiểm duyệt' })
  async generateAIModeration(
    @Param('documentId') documentId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const result =
        await this.documentsService.generateModerationAnalysis(documentId);

      return ResponseHelper.success(
        res,
        result,
        result.success
          ? 'Đã phân tích AI thành công'
          : 'Phân tích AI gặp lỗi, vui lòng kiểm tra lại',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể phân tích AI cho tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
