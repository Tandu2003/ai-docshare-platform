/**
 * Search History Service
 *
 * Manages search history storage and retrieval:
 * - Save user search history
 * - Track search embeddings
 */

import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

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
  private readonly logger = new Logger(SearchHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save search history record
   */
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

      this.logger.log(`Saved search history for user ${options.userId}`);
    } catch (error) {
      this.logger.error('Error saving search history:', error);
      // Don't throw - search history is not critical
    }
  }

  /**
   * Get user search history
   */
  async getUserSearchHistory(userId: string, limit = 50) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { searchedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get popular search queries
   */
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
