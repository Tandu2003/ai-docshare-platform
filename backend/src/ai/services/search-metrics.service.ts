/**
 * Search Metrics Service
 *
 * Tracks and reports search performance metrics:
 * - Search counts by type
 * - Latency tracking
 * - Cache hit tracking
 */

import { Injectable } from '@nestjs/common';

export interface SearchMetrics {
  totalSearches: number;
  vectorSearches: number;
  keywordSearches: number;
  hybridSearches: number;
  averageLatency: number;
  cacheHits: number;
}

@Injectable()
export class SearchMetricsService {
  private metrics: SearchMetrics = {
    totalSearches: 0,
    vectorSearches: 0,
    keywordSearches: 0,
    hybridSearches: 0,
    averageLatency: 0,
    cacheHits: 0,
  };

  /**
   * Increment total search count
   */
  incrementTotalSearches(): void {
    this.metrics.totalSearches++;
  }

  /**
   * Increment vector search count
   */
  incrementVectorSearches(): void {
    this.metrics.vectorSearches++;
  }

  /**
   * Increment keyword search count
   */
  incrementKeywordSearches(): void {
    this.metrics.keywordSearches++;
  }

  /**
   * Increment hybrid search count
   */
  incrementHybridSearches(): void {
    this.metrics.hybridSearches++;
  }

  /**
   * Increment cache hits
   */
  incrementCacheHits(): void {
    this.metrics.cacheHits++;
  }

  /**
   * Update average latency
   */
  updateLatency(latency: number): void {
    const totalSearches = this.metrics.totalSearches;
    if (totalSearches === 0) {
      this.metrics.averageLatency = latency;
    } else {
      this.metrics.averageLatency =
        (this.metrics.averageLatency * (totalSearches - 1) + latency) /
        totalSearches;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SearchMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalSearches: 0,
      vectorSearches: 0,
      keywordSearches: 0,
      hybridSearches: 0,
      averageLatency: 0,
      cacheHits: 0,
    };
  }
}
