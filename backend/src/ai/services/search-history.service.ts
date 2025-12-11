import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface SaveSearchHistoryOptions {
  userId: string;
  query: string;
  queryEmbedding: number[];
  searchMethod: string;
  vectorScore: number | null;
  resultsCount: number;
  filters?: Record<string, any>;
}
@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async saveSearchHistory(options: SaveSearchHistoryOptions): Promise<void> {
    try {
      if (!options.userId) return;

      await this.prisma.searchHistory.create({
        data: {
          userId: options.userId,
          query: options.query,
          queryEmbedding: options.queryEmbedding,
          searchMethod: options.searchMethod,
          vectorScore: options.vectorScore,
          resultsCount: options.resultsCount,
          filters: options.filters || {},
        },
      });
    } catch {
      // Don't throw - search history is not critical
    }
  }

  async getUserSearchHistory(userId: string, limit = 50) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { searchedAt: 'desc' },
      take: limit,
    });
  }

  async getPopularSearches(limit = 10) {
    const results = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    return results.map(r => ({
      query: r.query,
      count: r._count.query,
    }));
  }
}
