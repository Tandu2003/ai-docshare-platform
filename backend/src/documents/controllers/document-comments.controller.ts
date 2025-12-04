import { Public } from '@/auth/decorators/public.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/auth/guards/optional-jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { CreateCommentDto } from '@/documents/dto/create-comment.dto';
import { UpdateCommentDto } from '@/documents/dto/update-comment.dto';
import { AuthenticatedRequest } from '@/documents/interfaces';
import { DocumentCommentService } from '@/documents/services/document-comment.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
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

@ApiTags('Document Comments')
@Controller('documents')
@ApiBearerAuth()
export class DocumentCommentsController {
  private readonly logger = new Logger(DocumentCommentsController.name);

  constructor(private readonly commentService: DocumentCommentService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':documentId/comments')
  @ApiOperation({ summary: 'Get comments for a document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Danh sách bình luận' })
  async getComments(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      const comments = await this.commentService.getComments(
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
      const comment = await this.commentService.addComment(
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
      const updated = await this.commentService.likeComment(
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
      const updated = await this.commentService.editComment(
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
      await this.commentService.deleteComment(documentId, commentId, userId);
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
}
