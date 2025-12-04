/**
 * Trending Analytics Service
 *
 * Handles trending document calculations:
 * - Score-based trending
 * - Growth analysis
 */

import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsUtilService } from './analytics-util.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TrendingAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilService: AnalyticsUtilService,
  ) {}

  /**
   * Get trending analytics
   */
  async getTrendingAnalytics(range?: string) {
    const {
      range: normalizedRange,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    } = this.utilService.resolveRange(range);

    const [downloadsCurrent, viewsCurrent, downloadsPrevious, viewsPrevious] =
      await Promise.all([
        this.prisma.download.groupBy({
          by: ['documentId'],
          where: { downloadedAt: { gte: startDate, lte: endDate } },
          _count: { documentId: true },
        }),
        this.prisma.view.groupBy({
          by: ['documentId'],
          where: { viewedAt: { gte: startDate, lte: endDate } },
          _count: { documentId: true },
        }),
        this.prisma.download.groupBy({
          by: ['documentId'],
          where: {
            downloadedAt: { gte: previousStartDate, lt: previousEndDate },
          },
          _count: { documentId: true },
        }),
        this.prisma.view.groupBy({
          by: ['documentId'],
          where: { viewedAt: { gte: previousStartDate, lt: previousEndDate } },
          _count: { documentId: true },
        }),
      ]);

    const docIdSet = new Set<string>();
    downloadsCurrent.forEach(item => docIdSet.add(item.documentId));
    viewsCurrent.forEach(item => docIdSet.add(item.documentId));

    if (docIdSet.size === 0) {
      return {
        timeframe: {
          range: normalizedRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        stats: { totalTrending: 0, averageScore: 0, topGrowth: 0 },
        documents: [],
      };
    }

    const downloadsMap = this.buildCountMap(downloadsCurrent);
    const viewsMap = this.buildCountMap(viewsCurrent);
    const downloadsPrevMap = this.buildCountMap(downloadsPrevious);
    const viewsPrevMap = this.buildCountMap(viewsPrevious);

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
          select: { firstName: true, lastName: true },
        },
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    const trendingDocuments = documents
      .map(document => {
        const downloads = downloadsMap.get(document.id) ?? 0;
        const views = viewsMap.get(document.id) ?? 0;
        const previousDownloads = downloadsPrevMap.get(document.id) ?? 0;
        const previousViews = viewsPrevMap.get(document.id) ?? 0;
        const rating = Number(document.averageRating || 0);

        const score = downloads * 3 + views + rating * 10;
        const previousScore =
          previousDownloads * 3 + previousViews + rating * 10;

        const change = this.utilService.calculateChange(score, previousScore);

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
          createdAt:
            document.createdAt?.toISOString() || new Date().toISOString(),
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
      .filter(doc => doc.downloadCount > 0 || doc.viewCount > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 20);

    const totalScore = trendingDocuments.reduce(
      (sum, doc) => sum + doc.trendingScore,
      0,
    );
    const averageScore = trendingDocuments.length
      ? Number((totalScore / trendingDocuments.length).toFixed(1))
      : 0;
    const topGrowth = trendingDocuments.length
      ? Math.max(...trendingDocuments.map(doc => doc.trendingChange))
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

  /**
   * Build count map from grouped results
   */
  private buildCountMap(
    groupedResults: Array<{
      documentId: string;
      _count: { documentId: number };
    }>,
  ): Map<string, number> {
    const map = new Map<string, number>();
    groupedResults.forEach(item => {
      map.set(item.documentId, Number(item._count.documentId || 0));
    });
    return map;
  }
}
