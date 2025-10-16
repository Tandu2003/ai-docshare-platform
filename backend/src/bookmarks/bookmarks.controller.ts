import { ResponseHelper } from '../common/helpers/response.helper';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { CheckPolicy } from '@/common/casl';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Bookmarks')
@ApiBearerAuth()
@Controller('bookmarks')
export class BookmarksController {
  private readonly logger = new Logger(BookmarksController.name);

  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get('stats')
  @CheckPolicy({ action: 'read', subject: 'Bookmark' })
  @ApiOperation({
    summary: 'Get bookmark statistics for the authenticated user',
  })
  async getBookmarkStats(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn(
        'Attempt to access bookmark stats without authenticated user',
      );
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
    } catch (error) {
      this.logger.error(
        `Failed to load bookmark stats for user ${userId}`,
        error as Error,
      );
      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi truy xuất thống kê đánh dấu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @CheckPolicy({ action: 'create', subject: 'Bookmark' })
  @ApiOperation({ summary: 'Create a bookmark for a document' })
  async createBookmark(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Body() payload: CreateBookmarkDto,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn('Attempt to create bookmark without authenticated user');
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const bookmark = await this.bookmarksService.createBookmark(
        userId,
        payload,
      );
      return ResponseHelper.success(
        res,
        bookmark,
        'Đánh dấu đã được tạo thành công',
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create bookmark for user ${userId}`,
        error as Error,
      );
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
  @CheckPolicy({ action: 'delete', subject: 'Bookmark' })
  @ApiOperation({ summary: 'Delete a bookmark' })
  async deleteBookmark(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Param('bookmarkId') bookmarkId: string,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn('Attempt to delete bookmark without authenticated user');
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
      this.logger.error(
        `Failed to delete bookmark ${bookmarkId} for user ${userId}`,
        error as Error,
      );
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
  @CheckPolicy({ action: 'read', subject: 'Bookmark' })
  @ApiOperation({ summary: 'Get bookmarks for the authenticated user' })
  async getBookmarks(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('documentId') documentId?: string,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      this.logger.warn(
        'Attempt to access bookmarks without authenticated user',
      );
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
    } catch (error) {
      this.logger.error(
        `Failed to fetch bookmarks for user ${userId}`,
        error as Error,
      );
      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi truy xuất đánh dấu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
