import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: {
    parent: {
      select: {
        id: true;
        name: true;
        icon: true;
        color: true;
      };
    };
  };
}>;

interface CategoryWithMetrics extends CategoryWithParent {
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async attachMetrics(categories: CategoryWithParent[]): Promise<CategoryWithMetrics[]> {
    if (categories.length === 0) {
      return [];
    }

    const categoryIds = categories.map((category) => category.id);

    const aggregates = await this.prisma.document.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
      _count: {
        categoryId: true,
      },
      _sum: {
        downloadCount: true,
        viewCount: true,
      },
    });

    const metricsMap = new Map<
      string,
      { documentCount: number; totalDownloads: number; totalViews: number }
    >();
    aggregates.forEach((aggregate) => {
      metricsMap.set(aggregate.categoryId, {
        documentCount: aggregate._count?.categoryId ?? 0,
        totalDownloads: Number(aggregate._sum?.downloadCount ?? 0),
        totalViews: Number(aggregate._sum?.viewCount ?? 0),
      });
    });

    return categories.map((category) => {
      const metrics = metricsMap.get(category.id);
      return {
        ...category,
        documentCount: metrics?.documentCount ?? 0,
        totalDownloads: metrics?.totalDownloads ?? 0,
        totalViews: metrics?.totalViews ?? 0,
      };
    });
  }

  private mapCategoryResponse(category: CategoryWithMetrics) {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      parentId: category.parentId,
      isActive: category.isActive,
      documentCount: category.documentCount,
      totalDownloads: category.totalDownloads,
      totalViews: category.totalViews,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            icon: category.parent.icon,
            color: category.parent.color,
          }
        : null,
    };
  }

  async findAll(includeInactive = true) {
    const categories = await this.prisma.category.findMany({
      where: includeInactive
        ? undefined
        : {
            isActive: true,
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const categoriesWithMetrics = await this.attachMetrics(categories);
    return categoriesWithMetrics.map((category) => this.mapCategoryResponse(category));
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
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

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  private async validateParent(categoryId: string | undefined, parentId?: string) {
    if (!parentId) {
      return;
    }

    if (categoryId && categoryId === parentId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const parentExists = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentExists) {
      throw new BadRequestException('Parent category not found');
    }
  }

  async createCategory(dto: CreateCategoryDto) {
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

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const parentProvided = dto.parentId !== undefined;
    const trimmedParentId =
      parentProvided && typeof dto.parentId === 'string' ? dto.parentId.trim() : dto.parentId;
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

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException('Cannot delete category with child categories');
    }

    const documentCount = await this.prisma.document.count({
      where: { categoryId: id },
    });

    if (documentCount > 0) {
      throw new BadRequestException('Cannot delete category with associated documents');
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }
}
