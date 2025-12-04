import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CategoriesService } from '@/categories/categories.service';
import { CreateCategoryDto } from '@/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '@/categories/dto/update-category.dto';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import { ResponseHelper } from '@/common/helpers/response.helper';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get categories' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include inactive categories (default: true)',
  })
  async getCategories(
    @Query('includeInactive') includeInactive: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const include =
        includeInactive === undefined
          ? true
          : !['false', '0', 'no'].includes(includeInactive);
      const categories = await this.categoriesService.findAll(include);
      return ResponseHelper.success(
        res,
        categories,
        'Danh mục đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error('Error retrieving categories', error);
      return ResponseHelper.error(
        res,
        'Không thể truy xuất danh mục',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public categories (active only)' })
  async getPublicCategories(@Res() res: FastifyReply) {
    try {
      const categories = await this.categoriesService.findAll(false);
      return ResponseHelper.success(
        res,
        categories,
        'Danh mục công khai đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error('Error retrieving public categories', error);
      return ResponseHelper.error(
        res,
        'Không thể truy xuất danh mục công khai',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category detail with documents' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    type: Number,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description:
      'Sort field (createdAt, downloadCount, viewCount, averageRating)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    description: 'Sort order (asc|desc)',
  })
  async getCategoryDetail(
    @Param('id') id: string,
    @Res() res: FastifyReply,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    try {
      const result = await this.categoriesService.getCategoryWithDocuments({
        id,
        page: Number(page) || 1,
        limit: Number(limit) || 12,
        sort: sort as any,
        order: order || 'desc',
      });
      return ResponseHelper.success(
        res,
        result,
        'Chi tiết danh mục và danh sách tài liệu',
      );
    } catch (error) {
      this.logger.error(`Error retrieving category ${id} detail`, error);
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error instanceof HttpException
          ? error.message
          : 'Không thể truy xuất chi tiết danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }

  @Post('suggest-for-document/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI suggests categories for a document' })
  async suggestCategoriesForDocument(
    @Param('documentId') documentId: string,
    @Res() res: FastifyReply,
    @Request() req: any,
  ) {
    try {
      const suggestions =
        await this.categoriesService.suggestCategoriesForDocument(
          documentId,
          req.user?.id,
        );
      return ResponseHelper.success(
        res,
        suggestions,
        'Gợi ý danh mục cho tài liệu',
      );
    } catch (error) {
      this.logger.error(
        `Error suggesting categories for document ${documentId}`,
        error,
      );
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error instanceof HttpException
          ? error.message
          : 'Không thể gợi ý danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }

  @Post()
  @AdminOnly()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ summary: 'Create category' })
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @Res() res: FastifyReply,
    @Request() req: any,
  ) {
    try {
      const category = await this.categoriesService.createCategory(
        dto,
        req.user,
      );
      return ResponseHelper.success(
        res,
        category,
        'Danh mục đã được tạo thành công',
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error('Error creating category', error);
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error instanceof HttpException
          ? error.message
          : 'Không thể tạo danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }

  @Patch(':id')
  @AdminOnly()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Res() res: FastifyReply,
    @Request() req: any,
  ) {
    try {
      const category = await this.categoriesService.updateCategory(
        id,
        dto,
        req.user,
      );
      return ResponseHelper.success(
        res,
        category,
        'Danh mục đã được cập nhật thành công',
      );
    } catch (error) {
      this.logger.error(`Error updating category ${id}`, error);
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error instanceof HttpException
          ? error.message
          : 'Không thể cập nhật danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }

  @Delete(':id')
  @AdminOnly()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(
    @Param('id') id: string,
    @Res() res: FastifyReply,
    @Request() req: any,
  ) {
    try {
      await this.categoriesService.deleteCategory(id, req.user);
      return ResponseHelper.success(
        res,
        null,
        'Danh mục đã được xóa thành công',
      );
    } catch (error) {
      this.logger.error(`Error deleting category ${id}`, error);
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error instanceof HttpException
          ? error.message
          : 'Không thể xóa danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }
}
