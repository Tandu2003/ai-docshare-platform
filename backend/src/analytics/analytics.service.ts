import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const DEFAULT_RANGE = '30d';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const subtractDays = (date: Date, days: number) => new Date(date.getTime() - days * MS_PER_DAY);

const subtractMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const formatMonthLabel = (date: Date) =>
  date.toLocaleString('en', {
    month: 'short',
  });

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(range: string | undefined) {
    const normalized = range?.toLowerCase();
    const days =
      normalized && RANGE_TO_DAYS[normalized]
        ? RANGE_TO_DAYS[normalized]
        : RANGE_TO_DAYS[DEFAULT_RANGE];

    const endDate = new Date();
    const startDate = subtractDays(endDate, days);
    const previousStartDate = subtractDays(startDate, days);
    const previousEndDate = startDate;

    return {
      range: normalized && RANGE_TO_DAYS[normalized] ? normalized : DEFAULT_RANGE,
      days,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    };
  }

  async getDashboardOverview() {
    const [
      totalDocuments,
      totalUsers,
      downloadsAggregate,
      viewsAggregate,
      recentDocumentsRaw,
      categoryAggregates,
      activityLogsRaw,
      notificationsRaw,
    ] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.user.count(),
      this.prisma.document.aggregate({
        _sum: { downloadCount: true },
      }),
      this.prisma.document.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.document.findMany({
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      this.prisma.document.groupBy({
        by: ['categoryId'],
        _count: {
          categoryId: true,
        },
        _sum: {
          downloadCount: true,
          viewCount: true,
        },
        orderBy: {
          _sum: {
            downloadCount: 'desc',
          },
        },
        take: 6,
      }),
      this.prisma.activityLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      }),
      this.prisma.notification.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
    ]);

    const categoryIds = categoryAggregates.map((item) => item.categoryId);
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: {
            id: {
              in: categoryIds,
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true,
          },
        })
      : [];

    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    const popularCategories = categoryAggregates.map((aggregate) => {
      const category = categoryMap.get(aggregate.categoryId);
      return {
        id: aggregate.categoryId,
        name: category?.name ?? 'Unknown',
        description: category?.description ?? null,
        icon: category?.icon ?? '📄',
        color: category?.color ?? null,
        documentCount: aggregate._count.categoryId,
        totalDownloads: Number(aggregate._sum.downloadCount ?? 0),
        totalViews: Number(aggregate._sum.viewCount ?? 0),
      };
    });

    const userActivity = activityLogsRaw.map((activity) => ({
      id: activity.id,
      userId: activity.userId ?? undefined,
      action: activity.action,
      resourceType: activity.resourceType ?? undefined,
      resourceId: activity.resourceId ?? undefined,
      ipAddress: activity.ipAddress ?? undefined,
      userAgent: activity.userAgent ?? undefined,
      metadata: activity.metadata ?? undefined,
      createdAt: activity.createdAt,
      user: activity.user
        ? {
            id: activity.user.id,
            firstName: activity.user.firstName,
            lastName: activity.user.lastName,
            avatar: activity.user.avatar ?? undefined,
            username: activity.user.username,
          }
        : undefined,
    }));

    const recentNotifications = notificationsRaw.map((notification) => ({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ?? undefined,
      isRead: notification.isRead,
      readAt: notification.readAt ?? undefined,
      createdAt: notification.createdAt,
      user: {
        id: notification.user.id,
        firstName: notification.user.firstName,
        lastName: notification.user.lastName,
        avatar: notification.user.avatar ?? undefined,
        username: notification.user.username,
      },
    }));

    return {
      totalDocuments,
      totalUsers,
      totalDownloads: Number(downloadsAggregate._sum.downloadCount ?? 0),
      totalViews: Number(viewsAggregate._sum.viewCount ?? 0),
      recentDocuments: recentDocumentsRaw,
      popularCategories,
      userActivity,
      recentNotifications,
    };
  }

  async getAnalytics(range?: string) {
    const {
      range: normalizedRange,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    } = this.resolveRange(range);

    const [
      totalDocuments,
      downloadsAggregate,
      viewsAggregate,
      averageRatingAggregate,
      documentsInRange,
      documentsPreviousRange,
      totalUsers,
      activeUsers,
      newUsers,
      previousNewUsers,
    ] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.aggregate({
        _sum: { downloadCount: true },
      }),
      this.prisma.document.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.document.aggregate({
        _avg: { averageRating: true },
      }),
      this.prisma.document.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.document.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { isActive: true },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
      }),
    ]);

    const totalDownloads = Number(downloadsAggregate._sum.downloadCount || 0);
    const totalViews = Number(viewsAggregate._sum.viewCount || 0);
    const averageRating = Number(averageRatingAggregate._avg.averageRating || 0);

    const monthlyGrowth =
      documentsPreviousRange > 0
        ? Number(
            (((documentsInRange - documentsPreviousRange) / documentsPreviousRange) * 100).toFixed(
              1
            )
          )
        : documentsInRange > 0
          ? 100
          : 0;

    const userGrowth =
      previousNewUsers > 0
        ? Number((((newUsers - previousNewUsers) / previousNewUsers) * 100).toFixed(1))
        : newUsers > 0
          ? 100
          : 0;

    const topCategoriesRaw = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: { documents: true },
        },
      },
      orderBy: {
        documents: {
          _count: 'desc',
        },
      },
      take: 6,
    });

    const topCategories = topCategoriesRaw
      .filter((category) => category._count.documents > 0)
      .map((category) => ({
        name: category.name,
        icon: category.icon || '📄',
        count: category._count.documents,
        percentage:
          totalDocuments > 0
            ? Number(((category._count.documents / totalDocuments) * 100).toFixed(1))
            : 0,
      }));

    const topLanguagesGroup = await this.prisma.document.groupBy({
      by: ['language'],
      _count: {
        language: true,
      },
      orderBy: {
        _count: {
          language: 'desc',
        },
      },
      take: 6,
    });

    const topLanguages = topLanguagesGroup.map((lang) => ({
      code: lang.language || 'unknown',
      count: lang._count.language,
      percentage:
        totalDocuments > 0 ? Number(((lang._count.language / totalDocuments) * 100).toFixed(1)) : 0,
    }));

    const topDocumentsRaw = await this.prisma.document.findMany({
      where: {},
      select: {
        id: true,
        title: true,
        downloadCount: true,
        viewCount: true,
        averageRating: true,
        language: true,
        category: {
          select: { name: true },
        },
      },
      orderBy: [
        {
          downloadCount: 'desc',
        },
        {
          viewCount: 'desc',
        },
      ],
      take: 5,
    });

    const topDocuments = topDocumentsRaw.map((doc) => ({
      id: doc.id,
      title: doc.title,
      downloads: doc.downloadCount || 0,
      views: doc.viewCount || 0,
      rating: Number((doc.averageRating || 0).toFixed(2)),
      category: doc.category?.name || 'Uncategorized',
      language: doc.language || 'unknown',
    }));

    const monthlyStats: { month: string; downloads: number; views: number; documents: number }[] =
      [];
    for (let i = 5; i >= 0; i -= 1) {
      const targetDate = subtractMonths(endDate, i);
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(targetDate);

      const [downloadsCount, viewsCount, documentsCount] = await Promise.all([
        this.prisma.download.count({
          where: {
            downloadedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        this.prisma.view.count({
          where: {
            viewedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
        this.prisma.document.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
      ]);

      monthlyStats.push({
        month: formatMonthLabel(monthStart),
        downloads: downloadsCount,
        views: viewsCount,
        documents: documentsCount,
      });
    }

    return {
      timeframe: {
        range: normalizedRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalDocuments,
      totalDownloads,
      totalViews,
      averageRating: Number(averageRating.toFixed(2)),
      monthlyGrowth,
      topCategories,
      topLanguages,
      topDocuments,
      monthlyStats,
      userStats: {
        totalUsers,
        activeUsers,
        newUsers,
        userGrowth,
      },
    };
  }

  async getTrendingAnalytics(range?: string) {
    const {
      range: normalizedRange,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    } = this.resolveRange(range);

    const [downloadsCurrent, viewsCurrent, downloadsPrevious, viewsPrevious] = await Promise.all([
      this.prisma.download.groupBy({
        by: ['documentId'],
        where: {
          downloadedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          documentId: true,
        },
      }),
      this.prisma.view.groupBy({
        by: ['documentId'],
        where: {
          viewedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          documentId: true,
        },
      }),
      this.prisma.download.groupBy({
        by: ['documentId'],
        where: {
          downloadedAt: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
        _count: {
          documentId: true,
        },
      }),
      this.prisma.view.groupBy({
        by: ['documentId'],
        where: {
          viewedAt: {
            gte: previousStartDate,
            lt: previousEndDate,
          },
        },
        _count: {
          documentId: true,
        },
      }),
    ]);

    const docIdSet = new Set<string>();
    downloadsCurrent.forEach((item) => docIdSet.add(item.documentId));
    viewsCurrent.forEach((item) => docIdSet.add(item.documentId));

    if (docIdSet.size === 0) {
      return {
        timeframe: {
          range: normalizedRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        stats: {
          totalTrending: 0,
          averageScore: 0,
          topGrowth: 0,
        },
        documents: [],
      };
    }

    const downloadsMap = new Map<string, number>();
    downloadsCurrent.forEach((item) => {
      downloadsMap.set(item.documentId, Number(item._count.documentId || 0));
    });

    const viewsMap = new Map<string, number>();
    viewsCurrent.forEach((item) => {
      viewsMap.set(item.documentId, Number(item._count.documentId || 0));
    });

    const downloadsPrevMap = new Map<string, number>();
    downloadsPrevious.forEach((item) => {
      downloadsPrevMap.set(item.documentId, Number(item._count.documentId || 0));
    });

    const viewsPrevMap = new Map<string, number>();
    viewsPrevious.forEach((item) => {
      viewsPrevMap.set(item.documentId, Number(item._count.documentId || 0));
    });

    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: Array.from(docIdSet) },
        isPublic: true,
        isApproved: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        tags: true,
        isPublic: true,
        isPremium: true,
        isApproved: true,
        averageRating: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    const trendingDocuments = documents
      .map((document) => {
        const downloads = downloadsMap.get(document.id) ?? 0;
        const views = viewsMap.get(document.id) ?? 0;
        const previousDownloads = downloadsPrevMap.get(document.id) ?? 0;
        const previousViews = viewsPrevMap.get(document.id) ?? 0;
        const rating = Number(document.averageRating || 0);

        const score = downloads * 3 + views + rating * 10;
        const previousScore = previousDownloads * 3 + previousViews + rating * 10;

        let change = 0;
        if (previousScore > 0) {
          change = Number((((score - previousScore) / previousScore) * 100).toFixed(1));
        } else if (score > 0) {
          change = 100;
        }

        return {
          id: document.id,
          title: document.title,
          description: document.description,
          language: document.language || 'unknown',
          category: document.category
            ? {
                id: document.category.id,
                name: document.category.name,
                icon: document.category.icon || '📄',
              }
            : undefined,
          tags: document.tags || [],
          uploader: document.uploader || null,
          downloadCount: downloads,
          viewCount: views,
          averageRating: Number(rating.toFixed(2)),
          createdAt: document.createdAt?.toISOString() || new Date().toISOString(),
          isPublic: document.isPublic,
          isPremium: document.isPremium,
          isApproved: document.isApproved,
          trendingScore: Number(score.toFixed(2)),
          trendingChange: change,
          lastUpdated:
            document.updatedAt?.toISOString() ||
            document.createdAt?.toISOString() ||
            new Date().toISOString(),
        };
      })
      .filter((doc) => doc.downloadCount > 0 || doc.viewCount > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 20);

    const totalScore = trendingDocuments.reduce((sum, doc) => sum + doc.trendingScore, 0);
    const averageScore = trendingDocuments.length
      ? Number((totalScore / trendingDocuments.length).toFixed(1))
      : 0;
    const topGrowth = trendingDocuments.length
      ? Math.max(...trendingDocuments.map((doc) => doc.trendingChange))
      : 0;

    return {
      timeframe: {
        range: normalizedRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      stats: {
        totalTrending: trendingDocuments.length,
        averageScore,
        topGrowth,
      },
      documents: trendingDocuments,
    };
  }

  async getTopRatedAnalytics(range?: string, minRatingsParam?: number) {
    const { range: normalizedRange, startDate, endDate } = this.resolveRange(range);

    const minRatings = Number.isFinite(minRatingsParam)
      ? Math.max(1, Math.floor(minRatingsParam as number))
      : 10;

    const ratingGroupsRaw = await this.prisma.rating.groupBy({
      by: ['documentId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
      orderBy: [
        {
          _avg: {
            rating: 'desc',
          },
        },
        {
          _count: {
            rating: 'desc',
          },
        },
      ],
    });

    const ratingGroups = ratingGroupsRaw
      .filter((group) => (group._count.rating ?? 0) >= minRatings)
      .slice(0, 50);

    if (ratingGroups.length === 0) {
      return {
        timeframe: {
          range: normalizedRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        filters: {
          minRatings,
        },
        stats: {
          totalDocuments: 0,
          averageRating: 0,
          totalRatings: 0,
          perfectCount: 0,
        },
        documents: [],
      };
    }

    const documentIds = ratingGroups.map((group) => group.documentId);
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
        isPublic: true,
        isApproved: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        tags: true,
        isPublic: true,
        isPremium: true,
        isApproved: true,
        downloadCount: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    const documentMap = new Map(documents.map((doc) => [doc.id, doc]));

    const topDocuments = ratingGroups
      .map((group, index) => {
        const document = documentMap.get(group.documentId);
        if (!document) {
          return null;
        }

        const averageRating = Number((group._avg?.rating ?? 0).toFixed(2));
        const ratingCount = group._count?.rating ?? 0;

        return {
          id: document.id,
          title: document.title,
          description: document.description,
          language: document.language || 'unknown',
          category: document.category
            ? {
                id: document.category.id,
                name: document.category.name,
                icon: document.category.icon || '📄',
              }
            : undefined,
          tags: document.tags || [],
          uploader: document.uploader || null,
          downloadCount: document.downloadCount || 0,
          viewCount: document.viewCount || 0,
          averageRating,
          ratingCount,
          createdAt: document.createdAt?.toISOString() || new Date().toISOString(),
          isPublic: document.isPublic,
          isPremium: document.isPremium,
          isApproved: document.isApproved,
          rank: index + 1,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const totalDocuments = topDocuments.length;
    const totalRatings = topDocuments.reduce((sum, doc) => sum + doc.ratingCount, 0);
    const averageRating = totalDocuments
      ? Number(
          (topDocuments.reduce((sum, doc) => sum + doc.averageRating, 0) / totalDocuments).toFixed(
            2
          )
        )
      : 0;
    const perfectCount = topDocuments.filter((doc) => doc.averageRating >= 4.8).length;

    return {
      timeframe: {
        range: normalizedRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      filters: {
        minRatings,
      },
      stats: {
        totalDocuments,
        averageRating,
        totalRatings,
        perfectCount,
      },
      documents: topDocuments,
    };
  }
}
