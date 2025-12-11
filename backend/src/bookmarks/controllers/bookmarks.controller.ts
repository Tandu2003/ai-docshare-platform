import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { BookmarksService } from '@/bookmarks/bookmarks.service';
import { CreateBookmarkDto } from '@/bookmarks/dto/create-bookmark.dto';
import { ResponseHelper } from '@/common/helpers/response.helper';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get bookmark statistics for the authenticated user',
  })
  async getBookmarkStats(
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
      const stats = await this.bookmarksService.getBookmarkStats(userId);
      return ResponseHelper.success(
        res,
        stats,
        'Thống kê đánh dấu đã được truy xuất thành công',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi truy xuất thống kê đánh dấu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a bookmark for a document' })
  async createBookmark(
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
    @Body() payload: CreateBookmarkDto,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check if request is from API key share
    const query = req.query as Record<string, string | undefined>;
    const isFromApiKey =
      req.headers['x-api-key'] !== undefined ||
      (query && query.apiKey !== undefined && query.apiKey !== '');

    try {
      const bookmark = await this.bookmarksService.createBookmark(userId, {
        ...payload,
        isFromApiKey,
      });
      return ResponseHelper.success(
        res,
        bookmark,
        'Đánh dấu đã được tạo thành công',
        HttpStatus.CREATED,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        return ResponseHelper.error(res, error.message, error.getStatus());
      }
      return ResponseHelper.error(
        res,
        'Không thể tạo đánh dấu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Delete(':bookmarkId')
  @ApiOperation({ summary: 'Delete a bookmark' })
  async deleteBookmark(
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
    @Param('bookmarkId') bookmarkId: string,
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
      await this.bookmarksService.removeBookmark(userId, bookmarkId);
      return ResponseHelper.deleted(res, 'Đánh dấu đã được xóa thành công');
    } catch (error) {
      if (error instanceof HttpException) {
        return ResponseHelper.error(res, error.message, error.getStatus());
      }
      return ResponseHelper.error(
        res,
        'Không thể xóa đánh dấu',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get bookmarks for the authenticated user' })
  async getBookmarks(
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('documentId') documentId?: string,
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
      const bookmarks = await this.bookmarksService.getUserBookmarks(userId, {
        folderId,
        search,
        documentId,
      });

      return ResponseHelper.success(
        res,
        bookmarks,
        'Đánh dấu đã được truy xuất thành công',
      );
    } catch {
      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi truy xuất đánh dấu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
