import { PrismaService } from '../prisma/prisma.service';
import {
  ActivityAnalyticsService,
  DashboardAnalyticsService,
  TrendingAnalyticsService,
} from './services';
import { Injectable } from '@nestjs/common';

const RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const DEFAULT_RANGE = '30d';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const subtractDays = (date: Date, days: number) =>
  new Date(date.getTime() - days * MS_PER_DAY);

const subtractMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const formatMonthLabel = (date: Date) =>
  date.toLocaleString('en', {
    month: 'short',
  });

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardAnalyticsService,
    private readonly trendingService: TrendingAnalyticsService,
    private readonly activityService: ActivityAnalyticsService,
  ) {}

  private getActivityDescription(activity: any): string {
    const userName = activity.user
      ? `${activity.user.firstName} ${activity.user.lastName}`.trim() ||
        activity.user.username
      : 'Người dùng ẩn danh';

    switch (activity.action) {
      case 'login':
        return `${userName} đã đăng nhập`;
      case 'logout':
        return `${userName} đã đăng xuất`;
      case 'upload':
        return `${userName} đã tải lên tài liệu mới`;
      case 'download':
        return `${userName} đã tải xuống tài liệu`;
      case 'view':
        return `${userName} đã xem tài liệu`;
      case 'create':
        return `${userName} đã tạo ${activity.resourceType || 'tài nguyên'}`;
      case 'update':
        return `${userName} đã cập nhật ${activity.resourceType || 'tài nguyên'}`;
      case 'delete':
        return `${userName} đã xóa ${activity.resourceType || 'tài nguyên'}`;
      case 'register':
        return `${userName} đã đăng ký tài khoản`;
      case 'verify_email':
        return `${userName} đã xác thực email`;
      default:
        return `${userName} đã thực hiện ${activity.action}`;
    }
  }

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
      range:
        normalized && RANGE_TO_DAYS[normalized] ? normalized : DEFAULT_RANGE,
      days,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    };
  }

  /**
   * Get dashboard overview for admin
   * @delegates DashboardAnalyticsService.getDashboardOverview
   */
  async getDashboardOverview(): Promise<any> {
    return this.dashboardService.getDashboardOverview();
  }

  /**
   * Get user-specific dashboard overview
   * @delegates DashboardAnalyticsService.getUserDashboardOverview
   */
  async getUserDashboardOverview(userId: string): Promise<any> {
    return this.dashboardService.getUserDashboardOverview(userId);
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
      ratedAverageAggregate,
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
        where: {
          totalRatings: {
            gt: 0,
          },
          averageRating: {
            gt: 0,
          },
        },
        _avg: { averageRating: true },
        _count: { averageRating: true },
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
    const averageRating = ratedAverageAggregate._avg.averageRating
      ? Number(ratedAverageAggregate._avg.averageRating.toFixed(2))
      : 0;

    const monthlyGrowth =
      documentsPreviousRange > 0
        ? Number(
            (
              ((documentsInRange - documentsPreviousRange) /
                documentsPreviousRange) *
              100
            ).toFixed(1),
          )
        : documentsInRange > 0
          ? 100
          : 0;

    const userGrowth =
      previousNewUsers > 0
        ? Number(
            (((newUsers - previousNewUsers) / previousNewUsers) * 100).toFixed(
              1,
            ),
          )
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
      .filter(category => category._count.documents > 0)
      .map(category => ({
        name: category.name,
        icon: category.icon || '📄',
        count: category._count.documents,
        percentage:
          totalDocuments > 0
            ? Number(
                ((category._count.documents / totalDocuments) * 100).toFixed(1),
              )
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

    const topLanguages = topLanguagesGroup.map(lang => ({
      code: lang.language || 'unknown',
      count: lang._count.language,
      percentage:
        totalDocuments > 0
          ? Number(((lang._count.language / totalDocuments) * 100).toFixed(1))
          : 0,
    }));

    const topDocumentsRaw = await this.prisma.document.findMany({
      where: {},
      select: {
        id: true,
        title: true,
        downloadCount: true,
        viewCount: true,
        averageRating: true,
        totalRatings: true,
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

    const topDocuments = topDocumentsRaw.map(doc => ({
      id: doc.id,
      title: doc.title,
      downloads: doc.downloadCount || 0,
      views: doc.viewCount || 0,
      rating:
        (doc.totalRatings || 0) > 0
          ? Number((doc.averageRating || 0).toFixed(2))
          : 0,
      ratingsCount: doc.totalRatings || 0,
      category: doc.category?.name || 'Uncategorized',
      language: doc.language || 'unknown',
    }));

    const monthlyStats: {
      month: string;
      downloads: number;
      views: number;
      documents: number;
    }[] = [];
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

  /**
   * Get trending analytics
   * @delegates TrendingAnalyticsService.getTrendingAnalytics
   */
  async getTrendingAnalytics(range?: string): Promise<any> {
    return this.trendingService.getTrendingAnalytics(range);
  }

  async getTopRatedAnalytics(range?: string, minRatingsParam?: number) {
    const {
      range: normalizedRange,
      startDate,
      endDate,
    } = this.resolveRange(range);

    const requestedMinRatings = Number.isFinite(minRatingsParam)
      ? Math.max(1, Math.floor(minRatingsParam as number))
      : 3;

    const fetchRatingGroups = async (useRequestedRange: boolean) =>
      this.prisma.rating.groupBy({
        by: ['documentId'],
        where: useRequestedRange
          ? {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }
          : undefined,
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

    const applyRatingFilter = (
      groups: Awaited<ReturnType<typeof fetchRatingGroups>>,
      minRatings: number,
    ) =>
      groups
        .filter(group => (group._count.rating ?? 0) >= minRatings)
        .slice(0, 50);

    const ratingGroupsRaw = await fetchRatingGroups(true);

    let appliedRange = normalizedRange;
    let appliedMinRatings = requestedMinRatings;
    let usedFallback = false;

    let ratingGroups = applyRatingFilter(ratingGroupsRaw, requestedMinRatings);

    if (ratingGroups.length === 0) {
      const allTimeGroups = await fetchRatingGroups(false);
      ratingGroups = applyRatingFilter(allTimeGroups, requestedMinRatings);
      if (ratingGroups.length > 0) {
        appliedRange = 'all-time';
        usedFallback = true;
      }
    }

    if (ratingGroups.length === 0 && appliedMinRatings > 1) {
      appliedMinRatings = 1;
      const sourceGroups =
        appliedRange === 'all-time'
          ? await fetchRatingGroups(false)
          : ratingGroupsRaw;
      ratingGroups = applyRatingFilter(sourceGroups, appliedMinRatings);
      if (ratingGroups.length > 0) {
        usedFallback = true;
      }
    }

    if (ratingGroups.length === 0) {
      return {
        timeframe: {
          range: appliedRange,
          startDate:
            appliedRange === 'all-time'
              ? new Date(0).toISOString()
              : startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        filters: {
          minRatings: appliedMinRatings,
        },
        meta: {
          appliedRange,
          usedFallback,
          appliedMinRatings,
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

    const documentIds = ratingGroups.map(group => group.documentId);
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

    const documentMap = new Map(documents.map(doc => [doc.id, doc]));

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
          createdAt:
            document.createdAt?.toISOString() || new Date().toISOString(),
          isPublic: document.isPublic,
          isPremium: document.isPremium,
          isApproved: document.isApproved,
          rank: index + 1,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const totalDocuments = topDocuments.length;
    const totalRatings = topDocuments.reduce(
      (sum, doc) => sum + doc.ratingCount,
      0,
    );
    const averageRating = totalDocuments
      ? Number(
          (
            topDocuments.reduce((sum, doc) => sum + doc.averageRating, 0) /
            totalDocuments
          ).toFixed(2),
        )
      : 0;
    const perfectCount = topDocuments.filter(
      doc => doc.averageRating >= 4.8,
    ).length;

    return {
      timeframe: {
        range: appliedRange,
        startDate:
          appliedRange === 'all-time'
            ? new Date(0).toISOString()
            : startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      filters: {
        minRatings: appliedMinRatings,
      },
      meta: {
        appliedRange,
        usedFallback,
        appliedMinRatings,
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

  async getDailyActivity(range?: string) {
    return this.activityService.getDailyActivity(range);
  }

  async getTopDocumentsByMetric(
    metric: 'downloads' | 'views',
    range?: string,
    limitParam?: number,
  ) {
    return this.activityService.getTopDocumentsByMetric(
      metric,
      range,
      limitParam,
    );
  }
}
