/**
 * Category Query Service
 *
 * Handles category query operations:
 * - Find all categories
 * - Find category by ID
 * - Get category with documents
 * - Get categories for selection UI
 */

import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
export class CategoryQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Attach metrics (document count, downloads, views) to categories
   */
  async attachMetrics(
    categories: CategoryWithParent[],
  ): Promise<CategoryWithMetrics[]> {
    if (categories.length === 0) {
      return [];
    }

    const categoryIds = categories.map(category => category.id);

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
    aggregates.forEach(aggregate => {
      metricsMap.set(aggregate.categoryId, {
        documentCount: aggregate._count?.categoryId ?? 0,
        totalDownloads: Number(aggregate._sum?.downloadCount ?? 0),
        totalViews: Number(aggregate._sum?.viewCount ?? 0),
      });
    });

    return categories.map(category => {
      const metrics = metricsMap.get(category.id);
      return {
        ...category,
        documentCount: metrics?.documentCount ?? 0,
        totalDownloads: metrics?.totalDownloads ?? 0,
        totalViews: metrics?.totalViews ?? 0,
      };
    });
  }

  /**
   * Map category to response format
   */
  mapCategoryResponse(category: CategoryWithMetrics) {
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

  /**
   * Find all categories with optional active filter
   */
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
    return categoriesWithMetrics.map(category =>
      this.mapCategoryResponse(category),
    );
  }

  /**
   * Find category by ID
   */
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
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  /**
   * Get category with paginated documents
   */
  async getCategoryWithDocuments(params: {
    id: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'downloadCount' | 'viewCount' | 'averageRating';
    order?: 'asc' | 'desc';
  }) {
    const {
      id,
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc',
    } = params;

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, icon: true, color: true } },
        children: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            isActive: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.min(Math.max(1, limit), 100);

    const documentWhere = {
      categoryId: id,
      isApproved: true,
      isPublic: true,
      isDraft: false,
    };

    const [total, documents] = await this.prisma.$transaction([
      this.prisma.document.count({ where: documentWhere }),
      this.prisma.document.findMany({
        where: documentWhere,
        orderBy: { [sort]: order },
        skip,
        take,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
      }),
    ]);

    const [categoryWithMetrics] = await this.attachMetrics([category as any]);

    return {
      category: {
        ...this.mapCategoryResponse(categoryWithMetrics),
        children: category.children?.filter(c => c.isActive) || [],
      },
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
      documents,
    };
  }

  /**
   * Get all categories for selection UI
   */
  async getCategoriesForSelection(): Promise<
    Array<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      color: string | null;
      parentId: string | null;
      parentName: string | null;
      isParent: boolean;
    }>
  > {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      parentName: c.parent?.name || null,
      isParent: c.children.length > 0,
    }));
  }
}
