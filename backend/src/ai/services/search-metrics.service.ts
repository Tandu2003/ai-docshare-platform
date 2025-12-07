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

  incrementTotalSearches(): void {
    this.metrics.totalSearches++;
  }

  incrementVectorSearches(): void {
    this.metrics.vectorSearches++;
  }

  incrementKeywordSearches(): void {
    this.metrics.keywordSearches++;
  }

  incrementHybridSearches(): void {
    this.metrics.hybridSearches++;
  }

  incrementCacheHits(): void {
    this.metrics.cacheHits++;
  }

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

  getMetrics(): SearchMetrics {
    return { ...this.metrics };
  }

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
