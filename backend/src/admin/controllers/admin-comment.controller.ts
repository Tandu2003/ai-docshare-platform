import { GetCommentsQueryDto } from '../dto/get-comments-query.dto';
import { AdminCommentService } from '../services/admin-comment.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import { ResponseHelper } from '@/common/helpers/response.helper';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  Query,
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
import { FastifyReply } from 'fastify';

@ApiTags('Admin Comments')
@ApiBearerAuth()
@Controller('admin/comments')
@UseGuards(JwtAuthGuard, RoleGuard)
@AdminOnly()
export class AdminCommentController {
  constructor(private readonly adminCommentService: AdminCommentService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bình luận (admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy danh sách bình luận thành công',
  })
  async getComments(
    @Query() query: GetCommentsQueryDto,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const result = await this.adminCommentService.getAllComments(query);

      return ResponseHelper.paginated(
        res,
        result.comments,
        result.page,
        result.limit,
        result.total,
        'Lấy danh sách bình luận thành công',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy danh sách bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê bình luận (admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy thống kê bình luận thành công',
  })
  async getCommentStats(@Res() res: FastifyReply): Promise<FastifyReply> {
    try {
      const stats = await this.adminCommentService.getCommentStats();

      return ResponseHelper.success(
        res,
        stats,
        'Lấy thống kê bình luận thành công',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Không thể lấy thống kê bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bình luận (admin)' })
  @ApiParam({ name: 'id', description: 'ID bình luận' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy chi tiết bình luận thành công',
  })
  async getCommentById(
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const comment = await this.adminCommentService.getCommentById(id);

      return ResponseHelper.success(
        res,
        comment,
        'Lấy chi tiết bình luận thành công',
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
        'Không thể lấy chi tiết bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bình luận (admin)' })
  @ApiParam({ name: 'id', description: 'ID bình luận' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Xóa vĩnh viễn (mặc định: false)',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa bình luận thành công',
  })
  async deleteComment(
    @Param('id') id: string,
    @Query('hard') hard: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const hardDelete = hard === 'true';

      await this.adminCommentService.deleteComment(id, hardDelete);

      return ResponseHelper.deleted(res, 'Xóa bình luận thành công');
    } catch (error) {
      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, error.message, HttpStatus.NOT_FOUND);
      }

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể xóa bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/restore')
  @ApiOperation({ summary: 'Khôi phục bình luận đã xóa (admin)' })
  @ApiParam({ name: 'id', description: 'ID bình luận' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Khôi phục bình luận thành công',
  })
  async restoreComment(
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      await this.adminCommentService.restoreComment(id);

      return ResponseHelper.success(
        res,
        { id },
        'Khôi phục bình luận thành công',
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
        'Không thể khôi phục bình luận',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
