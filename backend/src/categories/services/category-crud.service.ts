/**
 * Category CRUD Service
 *
 * Handles category CRUD operations:
 * - Create category
 * - Update category
 * - Delete category
 */

import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryQueryService } from './category-query.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryQueryService: CategoryQueryService,
  ) {}

  /**
   * Validate user role for category operations
   */
  private validateRole(user: any, requiredRoles: string[]): void {
    if (!user || !user.role) {
      throw new ForbiddenException(
        'Yêu cầu đăng nhập để thực hiện thao tác này',
      );
    }

    const userRole = user.role.name;
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Chỉ có ${requiredRoles.join(' hoặc ')} mới có thể thực hiện thao tác này`,
      );
    }
  }

  /**
   * Validate parent category
   */
  private async validateParent(
    categoryId: string | undefined,
    parentId?: string,
  ) {
    if (!parentId) {
      return;
    }

    if (categoryId && categoryId === parentId) {
      throw new BadRequestException(
        'Danh mục không thể là danh mục cha của chính nó',
      );
    }

    const parentExists = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentExists) {
      throw new BadRequestException('Không tìm thấy danh mục cha');
    }
  }

  /**
   * Create a new category
   */
  async createCategory(dto: CreateCategoryDto, user?: any) {
    this.validateRole(user, ['admin']);

    const parentId = dto.parentId?.trim() || undefined;
    await this.validateParent(undefined, parentId);

    const category = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        icon: dto.icon,
        color: dto.color,
        parentId: parentId ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    const [categoryWithMetrics] = await this.categoryQueryService.attachMetrics(
      [category],
    );
    return this.categoryQueryService.mapCategoryResponse(categoryWithMetrics);
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, dto: UpdateCategoryDto, user?: any) {
    this.validateRole(user, ['admin']);

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const parentProvided = dto.parentId !== undefined;
    const trimmedParentId =
      parentProvided && typeof dto.parentId === 'string'
        ? dto.parentId.trim()
        : dto.parentId;
    const normalizedParentId =
      typeof trimmedParentId === 'string' && trimmedParentId.length > 0
        ? trimmedParentId
        : undefined;

    if (parentProvided) {
      await this.validateParent(id, normalizedParentId);
    }

    const data: Prisma.CategoryUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      const trimmedDescription = dto.description.trim();
      data.description = trimmedDescription || null;
    }

    if (dto.icon !== undefined) {
      data.icon = dto.icon;
    }

    if (dto.color !== undefined) {
      data.color = dto.color;
    }

    if (parentProvided) {
      data.parentId = normalizedParentId ?? null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    const category = await this.prisma.category.update({
      where: { id },
      data,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    const [categoryWithMetrics] = await this.categoryQueryService.attachMetrics(
      [category],
    );
    return this.categoryQueryService.mapCategoryResponse(categoryWithMetrics);
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string, user?: any) {
    this.validateRole(user, ['admin']);

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException('Không thể xóa danh mục có danh mục con');
    }

    const documentCount = await this.prisma.document.count({
      where: { categoryId: id },
    });

    if (documentCount > 0) {
      throw new BadRequestException(
        'Không thể xóa danh mục có tài liệu liên kết',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }
}
