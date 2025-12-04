/**
 * Activity Analytics Service
 *
 * Handles daily activity and metric-based analytics:
 * - Daily activity tracking
 * - Top documents by metric (downloads/views)
 */

import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsUtilService } from './analytics-util.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilService: AnalyticsUtilService,
  ) {}

  /**
   * Get daily activity statistics
   */
  async getDailyActivity(range?: string) {
    const {
      startDate,
      endDate,
      range: normalizedRange,
    } = this.utilService.resolveRange(range);

    const [downloads, views, uploads] = await Promise.all([
      this.prisma.download.findMany({
        where: { downloadedAt: { gte: startDate, lte: endDate } },
        select: { downloadedAt: true },
      }),
      this.prisma.view.findMany({
        where: { viewedAt: { gte: startDate, lte: endDate } },
        select: { viewedAt: true },
      }),
      this.prisma.document.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
    ]);

    const seriesMap = this.initializeDaySeriesMap(startDate, endDate);

    for (const d of downloads) {
      const key = this.utilService.getDayKey(d.downloadedAt);
      const entry = seriesMap.get(key);
      if (entry) entry.downloads += 1;
    }

    for (const v of views) {
      const key = this.utilService.getDayKey(v.viewedAt);
      const entry = seriesMap.get(key);
      if (entry) entry.views += 1;
    }

    for (const u of uploads) {
      const key = this.utilService.getDayKey(u.createdAt as unknown as Date);
      const entry = seriesMap.get(key);
      if (entry) entry.uploads += 1;
    }

    const days = Array.from(seriesMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({ date, ...v }));

    return {
      timeframe: {
        range: normalizedRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      days,
    };
  }

  /**
   * Get top documents by metric (downloads or views)
   */
  async getTopDocumentsByMetric(
    metric: 'downloads' | 'views',
    range?: string,
    limitParam?: number,
  ) {
    const {
      startDate,
      endDate,
      range: normalizedRange,
    } = this.utilService.resolveRange(range);

    const limit = Number.isFinite(limitParam)
      ? Math.min(50, Math.max(1, Math.floor(limitParam as number)))
      : 10;

    const isDownloads = metric === 'downloads';

    const grouped = isDownloads
      ? await this.prisma.download.groupBy({
          by: ['documentId'],
          where: { downloadedAt: { gte: startDate, lte: endDate } },
          _count: { documentId: true },
        })
      : await this.prisma.view.groupBy({
          by: ['documentId'],
          where: { viewedAt: { gte: startDate, lte: endDate } },
          _count: { documentId: true },
        });

    const sorted = grouped
      .map(g => ({
        documentId: g.documentId,
        count: Number(g._count.documentId || 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    if (sorted.length === 0) {
      return {
        timeframe: {
          range: normalizedRange,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        metric,
        stats: { total: 0 },
        documents: [],
      };
    }

    const documents = await this.prisma.document.findMany({
      where: { id: { in: sorted.map(s => s.documentId) } },
      select: {
        id: true,
        title: true,
        downloadCount: true,
        viewCount: true,
        averageRating: true,
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    const map = new Map(documents.map(d => [d.id, d]));
    const result = sorted
      .map((s, idx) => {
        const doc = map.get(s.documentId);
        if (!doc) return null;
        return {
          id: doc.id,
          title: doc.title,
          count: s.count,
          downloads: doc.downloadCount || 0,
          views: doc.viewCount || 0,
          averageRating: Number((doc.averageRating || 0).toFixed(2)),
          category: doc.category
            ? {
                id: doc.category.id,
                name: doc.category.name,
                icon: doc.category.icon || '📄',
              }
            : undefined,
          rank: idx + 1,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return {
      timeframe: {
        range: normalizedRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metric,
      stats: { total: result.length },
      documents: result,
    };
  }

  /**
   * Initialize day series map
   */
  private initializeDaySeriesMap(
    startDate: Date,
    endDate: Date,
  ): Map<string, { uploads: number; downloads: number; views: number }> {
    const dayCursor = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const endDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      0,
      0,
      0,
      0,
    );

    const seriesMap = new Map<
      string,
      { uploads: number; downloads: number; views: number }
    >();

    while (dayCursor <= endDay) {
      seriesMap.set(dayCursor.toISOString().slice(0, 10), {
        uploads: 0,
        downloads: 0,
        views: 0,
      });
      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    return seriesMap;
  }
}
