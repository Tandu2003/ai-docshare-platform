/**
 * Search Cache Service
 *
 * Manages search result caching:
 * - In-memory caching with TTL
 * - LRU cache eviction
 * - Cache key generation
 */

import { Injectable, Logger } from '@nestjs/common';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface SearchCacheOptions {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  threshold?: number;
}

@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 500;
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key from search options
   */
  generateCacheKey(type: string, options: SearchCacheOptions): string {
    const filterStr = JSON.stringify(options.filters || {});
    return `${type}:${options.query}:${filterStr}:${options.limit || 10}:${options.threshold || 0.5}`;
  }

  /**
   * Get cached result
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('Search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttl,
    };
  }
}
