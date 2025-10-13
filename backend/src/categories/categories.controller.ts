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
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { CheckPolicy } from '@/common/casl';
import { ResponseHelper } from '@/common/helpers/response.helper';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
  async getCategories(@Query('includeInactive') includeInactive: string, @Res() res: Response) {
    try {
      const include =
        includeInactive === undefined ? true : !['false', '0', 'no'].includes(includeInactive);
      const categories = await this.categoriesService.findAll(include);
      return ResponseHelper.success(res, categories, 'Danh mục đã được truy xuất thành công');
    } catch (error) {
      this.logger.error('Error retrieving categories', error);
      return ResponseHelper.error(
        res,
        'Không thể truy xuất danh mục',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error
      );
    }
  }

  @Post()
  @CheckPolicy({ action: 'create', subject: 'Category' })
  @ApiOperation({ summary: 'Create category' })
  async createCategory(@Body() dto: CreateCategoryDto, @Res() res: Response) {
    try {
      const category = await this.categoriesService.createCategory(dto);
      return ResponseHelper.success(
        res,
        category,
        'Danh mục đã được tạo thành công',
        HttpStatus.CREATED
      );
    } catch (error) {
      this.logger.error('Error creating category', error);
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof HttpException ? error.message : 'Không thể tạo danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }

  @Patch(':id')
  @CheckPolicy({ action: 'update', subject: 'Category' })
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Res() res: Response
  ) {
    try {
      const category = await this.categoriesService.updateCategory(id, dto);
      return ResponseHelper.success(res, category, 'Danh mục đã được cập nhật thành công');
    } catch (error) {
      this.logger.error(`Error updating category ${id}`, error);
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof HttpException ? error.message : 'Không thể cập nhật danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }

  @Delete(':id')
  @CheckPolicy({ action: 'delete', subject: 'Category' })
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string, @Res() res: Response) {
    try {
      await this.categoriesService.deleteCategory(id);
      return ResponseHelper.success(res, null, 'Danh mục đã được xóa thành công');
    } catch (error) {
      this.logger.error(`Error deleting category ${id}`, error);
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof HttpException ? error.message : 'Không thể xóa danh mục';
      return ResponseHelper.error(res, message, status, error);
    }
  }
}
