import { AdminShareLinkService } from '../services/admin-share-link.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { GetShareLinksQueryDto } from '@/documents/dto/get-share-links-query.dto';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

@ApiTags('Admin Share Links')
@ApiBearerAuth()
@Controller('admin/share-links')
@UseGuards(JwtAuthGuard, RoleGuard)
@AdminOnly()
export class AdminShareLinkController {
  constructor(private readonly adminShareLinkService: AdminShareLinkService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách liên kết chia sẻ (admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy danh sách liên kết chia sẻ thành công',
  })
  async getShareLinks(
    @Query() query: GetShareLinksQueryDto,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const result = await this.adminShareLinkService.getAllShareLinks(query);

      return ResponseHelper.paginated(
        res,
        result.shareLinks,
        result.page,
        result.limit,
        result.total,
        'Lấy danh sách liên kết chia sẻ thành công',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy danh sách liên kết chia sẻ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê liên kết chia sẻ (admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy thống kê liên kết chia sẻ thành công',
  })
  async getShareLinkStats(@Res() res: FastifyReply): Promise<FastifyReply> {
    try {
      const stats = await this.adminShareLinkService.getShareLinkStats();

      return ResponseHelper.success(
        res,
        stats,
        'Lấy thống kê liên kết chia sẻ thành công',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Không thể lấy thống kê liên kết chia sẻ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết liên kết chia sẻ (admin)' })
  @ApiParam({ name: 'id', description: 'ID liên kết chia sẻ' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy chi tiết liên kết chia sẻ thành công',
  })
  async getShareLinkById(
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const shareLink = await this.adminShareLinkService.getShareLinkById(id);

      return ResponseHelper.success(
        res,
        shareLink,
        'Lấy chi tiết liên kết chia sẻ thành công',
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, error.message, HttpStatus.NOT_FOUND);
      }

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy chi tiết liên kết chia sẻ',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Thu hồi liên kết chia sẻ (admin)' })
  @ApiParam({ name: 'id', description: 'ID liên kết chia sẻ' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thu hồi liên kết chia sẻ thành công',
  })
  async revokeShareLink(
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      await this.adminShareLinkService.revokeShareLink(id);

      return ResponseHelper.deleted(res, 'Thu hồi liên kết chia sẻ thành công');
    } catch (error) {
      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, error.message, HttpStatus.NOT_FOUND);
      }

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
}
