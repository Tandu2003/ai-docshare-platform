import { apiClient } from '@/utils/api-client';

/**
 * Embedding metrics interface
 */
export interface EmbeddingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  cacheHits: number;
}

/**
 * Search metrics interface
 */
export interface SearchMetrics {
  totalSearches: number;
  vectorSearches: number;
  keywordSearches: number;
  hybridSearches: number;
  averageLatency: number;
  cacheHits: number;
}

/**
 * Combined metrics response
 */
export interface CombinedMetrics {
  embedding: EmbeddingMetrics;
  search: SearchMetrics;
}

/**
 * Regenerate embedding response
 */
export interface RegenerateEmbeddingResponse {
  success: boolean;
  documentId: string;
  embeddingDimension?: number;
  message: string;
}

/**
 * Embedding Service for AI vector operations
 */
export class EmbeddingService {
  /**
   * Regenerate embedding for a specific document
   */
  static async regenerateEmbedding(
    documentId: string,
  ): Promise<RegenerateEmbeddingResponse> {
    try {
      const response = await apiClient.post<RegenerateEmbeddingResponse>(
        `/ai/documents/${documentId}/regenerate-embedding`,
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(
        response.data?.message || 'Failed to regenerate embedding',
      );
    } catch (error) {
      console.error('Error regenerating embedding:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to regenerate embedding');
    }
  }

  /**
   * Get embedding and search metrics
   */
  static async getMetrics(): Promise<CombinedMetrics> {
    try {
      const response =
        await apiClient.get<CombinedMetrics>('/ai/search/metrics');

      if (response.success && response.data) {
        return response.data;
      }

      // Return empty metrics if failed
      return {
        embedding: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageLatency: 0,
          cacheHits: 0,
        },
        search: {
          totalSearches: 0,
          vectorSearches: 0,
          keywordSearches: 0,
          hybridSearches: 0,
          averageLatency: 0,
          cacheHits: 0,
        },
      };
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {
        embedding: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageLatency: 0,
          cacheHits: 0,
        },
        search: {
          totalSearches: 0,
          vectorSearches: 0,
          keywordSearches: 0,
          hybridSearches: 0,
          averageLatency: 0,
          cacheHits: 0,
        },
      };
    }
  }

  /**
   * Clear all caches (embedding and search)
   */
  static async clearCaches(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>('/ai/search/clear-cache');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.data?.message || 'Failed to clear caches');
    } catch (error) {
      console.error('Error clearing caches:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to clear caches');
    }
  }

  /**
   * Format metrics for display
   */
  static formatMetricsForDisplay(metrics: CombinedMetrics): {
    embedding: {
      totalRequests: string;
      successRate: string;
      averageLatency: string;
      cacheHitRate: string;
    };
    search: {
      totalSearches: string;
      vectorSearchRate: string;
      averageLatency: string;
      cacheHitRate: string;
    };
  } {
    const embeddingSuccessRate =
      metrics.embedding.totalRequests > 0
        ? (
            (metrics.embedding.successfulRequests /
              metrics.embedding.totalRequests) *
            100
          ).toFixed(1)
        : '0.0';

    const embeddingCacheHitRate =
      metrics.embedding.totalRequests > 0
        ? (
            (metrics.embedding.cacheHits / metrics.embedding.totalRequests) *
            100
          ).toFixed(1)
        : '0.0';

    const vectorSearchRate =
      metrics.search.totalSearches > 0
        ? (
            (metrics.search.vectorSearches / metrics.search.totalSearches) *
            100
          ).toFixed(1)
        : '0.0';

    const searchCacheHitRate =
      metrics.search.totalSearches > 0
        ? (
            (metrics.search.cacheHits / metrics.search.totalSearches) *
            100
          ).toFixed(1)
        : '0.0';

    return {
      embedding: {
        totalRequests: metrics.embedding.totalRequests.toLocaleString(),
        successRate: `${embeddingSuccessRate}%`,
        averageLatency: `${Math.round(metrics.embedding.averageLatency)}ms`,
        cacheHitRate: `${embeddingCacheHitRate}%`,
      },
      search: {
        totalSearches: metrics.search.totalSearches.toLocaleString(),
        vectorSearchRate: `${vectorSearchRate}%`,
        averageLatency: `${Math.round(metrics.search.averageLatency)}ms`,
        cacheHitRate: `${searchCacheHitRate}%`,
      },
    };
  }

  /**
   * Check if metrics indicate good performance
   */
  static isPerformanceGood(metrics: CombinedMetrics): {
    embedding: boolean;
    search: boolean;
  } {
    const embeddingGood =
      metrics.embedding.averageLatency < 1000 && // Less than 1 second
      (metrics.embedding.totalRequests === 0 ||
        metrics.embedding.successfulRequests / metrics.embedding.totalRequests >
          0.95); // 95% success rate

    const searchGood =
      metrics.search.averageLatency < 500 && // Less than 500ms
      metrics.search.cacheHits / Math.max(metrics.search.totalSearches, 1) >
        0.2; // 20% cache hit rate

    return {
      embedding: embeddingGood,
      search: searchGood,
    };
  }
}
