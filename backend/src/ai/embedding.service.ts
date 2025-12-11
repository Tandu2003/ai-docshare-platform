import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  cacheHits: number;
}
@Injectable()
export class EmbeddingService {
  private readonly apiKey: string | null;
  private readonly model: string;
  private genAI: GoogleGenerativeAI | null = null;
  private readonly embeddingCache = new Map<string, number[]>();
  private readonly maxCacheSize = 1000;
  private metrics: EmbeddingMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    cacheHits: 0,
  };

  constructor(private configService: ConfigService) {
    // Use Gemini API key for embeddings
    // Google's text-embedding-004 model via Gemini API
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || null;
    this.model =
      this.configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-004';

    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      } catch {
        // Failed to initialize Gemini API
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Check cache first
      const cacheKey = this.getCacheKey(text);
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }

      // Truncate text if too long (text-embedding-004 supports up to 2048 tokens)
      const maxLength = 8000; // Safe character limit (~2048 tokens)
      const truncatedText =
        text.length > maxLength ? text.substring(0, maxLength) : text;

      // If no API key, return placeholder (for development)
      if (!this.apiKey || !this.genAI) {
        return this.generatePlaceholderEmbedding(truncatedText);
      }

      // Use real Google Generative AI embedding API with retry logic
      const embedding = await this.generateEmbeddingWithRetry(truncatedText, 3);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding response format');
      }

      // Cache the result
      this.cacheEmbedding(cacheKey, embedding);

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, true);

      return embedding;
    } catch {
      this.metrics.failedRequests++;

      // Fallback to placeholder on error
      return this.generatePlaceholderEmbedding(text);
    }
  }

  private async generateEmbeddingWithRetry(
    text: string,
    maxRetries = 3,
  ): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateRealEmbedding(text);
      } catch (error) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimitError =
          (error as Error).message?.includes('429') ||
          (error as Error).message?.includes('rate limit') ||
          (error as Error).message?.includes('quota');

        // Check if it's a network error
        const isNetworkError =
          (error as Error).message?.includes('network') ||
          (error as Error).message?.includes('ECONNRESET') ||
          (error as Error).message?.includes('ETIMEDOUT');

        if (attempt < maxRetries && (isRateLimitError || isNetworkError)) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(delayMs);
          continue;
        }

        // Don't retry for other types of errors
        break;
      }
    }

    throw lastError || new Error('Failed to generate embedding after retries');
  }

  private async generateRealEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    try {
      // Use the embedContent method with text-embedding-004 model
      const model = this.genAI.getGenerativeModel({ model: this.model });

      // Call embedContent API
      const result = await model.embedContent(text);

      // Extract embedding values from response
      if (result.embedding && Array.isArray(result.embedding.values)) {
        return result.embedding.values;
      }

      throw new Error('Invalid embedding response structure');
    } catch {
      throw new Error('Failed to generate embedding');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateEmbeddingsBatch(
    texts: string[],
    concurrency = 5,
  ): Promise<number[][]> {
    try {
      if (!this.apiKey || !this.genAI) {
        return texts.map(text => this.generatePlaceholderEmbedding(text));
      }

      // Process in batches with concurrency limit
      const results: number[][] = [];
      for (let i = 0; i < texts.length; i += concurrency) {
        const batch = texts.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(text => this.generateEmbedding(text)),
        );
        results.push(...batchResults);

        // Small delay between batches to avoid rate limiting
        if (i + concurrency < texts.length) {
          await this.sleep(500);
        }
      }

      return results;
    } catch {
      // Fallback to individual placeholders
      return texts.map(text => this.generatePlaceholderEmbedding(text));
    }
  }

  private getCacheKey(text: string): string {
    // Use full text hash for cache key to avoid collisions
    // Also include model name in case model changes
    return `${this.model}:${this.simpleHash(text)}`;
  }

  private cacheEmbedding(key: string, embedding: number[]): void {
    // Implement LRU-like behavior: remove oldest if cache is full
    if (this.embeddingCache.size >= this.maxCacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, embedding);
  }

  private updateMetrics(latency: number, success: boolean): void {
    if (success) {
      this.metrics.successfulRequests++;
    }

    // Update average latency (moving average)
    const totalSuccessful = this.metrics.successfulRequests;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (totalSuccessful - 1) + latency) /
      totalSuccessful;
  }

  getMetrics(): EmbeddingMetrics {
    return { ...this.metrics };
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }

  private generatePlaceholderEmbedding(text: string): number[] {
    // Create a deterministic "embedding" based on text hash
    // This is NOT a real embedding but useful for development
    const hash = this.simpleHash(text);
    const dimension = 768; // text-embedding-004 dimension

    const embedding = Array.from({ length: dimension }, (_, i) => {
      // Use hash to seed pseudo-random values
      const seed = (hash + i * 7919) % 1000000; // Use prime for better distribution
      return (Math.sin(seed) * 0.5 + 0.5) / 10; // Normalize to small range
    });

    // Normalize vector to unit length (for cosine similarity)
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    return embedding.map(val => val / magnitude);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getEmbeddingDimension(): number {
    // Google's text-embedding-004 uses 768 dimensions
    return 768;
  }

  getModelName(): string {
    return this.model;
  }

  async generateEmbeddingStrict(text: string): Promise<number[]> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    // Truncate text if too long
    const maxLength = 8000;
    const truncatedText =
      text.length > maxLength ? text.substring(0, maxLength) : text;

    // If no API key, throw error instead of using placeholder
    if (!this.apiKey || !this.genAI) {
      throw new Error(
        'Cannot generate real embedding: GEMINI_API_KEY not configured',
      );
    }

    // Use real Google Generative AI embedding API with retry logic
    const embedding = await this.generateEmbeddingWithRetry(truncatedText, 3);

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding response format');
    }

    // Cache the result
    this.cacheEmbedding(cacheKey, embedding);

    // Update metrics
    const latency = Date.now() - startTime;
    this.updateMetrics(latency, true);

    return embedding;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.genAI);
  }
}
