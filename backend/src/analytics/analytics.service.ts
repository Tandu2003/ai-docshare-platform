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

const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const formatMonthLabel = (date: Date) =>
  date.toLocaleString('en', {
    month: 'short',
  });

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(range: string | undefined) {
    const normalized = range?.toLowerCase();
    const days = normalized && RANGE_TO_DAYS[normalized] ? RANGE_TO_DAYS[normalized] : RANGE_TO_DAYS[DEFAULT_RANGE];

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

  async getAnalytics(range?: string) {
    const { range: normalizedRange, startDate, endDate, previousStartDate, previousEndDate } =
      this.resolveRange(range);

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

    const monthlyStats: { month: string; downloads: number; views: number; documents: number }[] = [];
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
}
