import { Injectable } from '@nestjs/common';

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
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize = 500;
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  generateCacheKey(type: string, options: SearchCacheOptions): string {
    const filterStr = JSON.stringify(options.filters || {});
    return `${type}:${options.query}:${filterStr}:${options.limit || 10}:${options.threshold || 0.5}`;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

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

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttl,
    };
  }
}
