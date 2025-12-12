import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import {
  cosineSimilarity,
  HYBRID_SEARCH_WEIGHTS,
  KEYWORD_SCORE_WEIGHTS,
  SEARCH_CACHE_CONFIG,
  SEARCH_THRESHOLDS,
} from '@/common';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DocumentModerationStatus, Prisma } from '@prisma/client';

export interface VectorSearchOptions {
  query: string;
  userId?: string;
  userRole?: string;
  limit?: number;
  threshold?: number; // Minimum similarity score (0-1)
  recordHistory?: boolean;
  /** Internal flag to prevent double counting metrics when called from hybridSearch */
  isInternalCall?: boolean;
  filters?: {
    categoryId?: string;
    tags?: string[];
    language?: string;
    isPublic?: boolean;
    isApproved?: boolean;
  };
}

export interface VectorSearchResult {
  documentId: string;
  similarityScore: number;
}

export interface HybridSearchResult {
  documentId: string;
  vectorScore?: number;
  textScore?: number;
  combinedScore: number;
}

export interface SearchMetrics {
  totalSearches: number;
  vectorSearches: number;
  keywordSearches: number;
  hybridSearches: number;
  averageLatency: number;
  cacheHits: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly searchCache = new Map<string, any>();
  private readonly maxCacheSize = SEARCH_CACHE_CONFIG.MAX_SIZE;
  private readonly cacheTTL = SEARCH_CACHE_CONFIG.TTL_MS;
  private metrics: SearchMetrics = {
    totalSearches: 0,
    vectorSearches: 0,
    keywordSearches: 0,
    hybridSearches: 0,
    averageLatency: 0,
    cacheHits: 0,
  };

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
    private embeddingStorage: EmbeddingStorageService,
  ) {}

  private prepareQueryVariants(query: string) {
    const trimmed = query.trim();

    if (!trimmed) {
      return {
        trimmed: '',
        normalized: '',
        lowerTrimmed: '',
        lowerNormalized: '',
        condensedTrimmed: '',
        condensedNormalized: '',
        tokens: [] as string[],
        lowerTokens: [] as string[],
        embeddingText: '',
      };
    }

    const whitespaceNormalized = trimmed.replace(/\s+/g, ' ');

    const punctuationAsSpace = trimmed
      .replace(/[\u2013\u2014]/g, ' ')
      .replace(/["'`’“”]/g, ' ')
      .replace(/[\p{P}\p{S}]+/gu, ' ');

    const tokens = punctuationAsSpace
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length > 0);

    const lowerTokens = tokens.map(token => token.toLowerCase());

    const expandedTokens: string[] = [];
    const addToken = (token: string) => {
      if (!token) return;
      const trimmedToken = token.trim();
      if (!trimmedToken) return;
      if (!expandedTokens.includes(trimmedToken)) {
        expandedTokens.push(trimmedToken);
      }
    };

    const suffixHeuristics = ['js', 'ts', 'py', 'rb', 'go', 'net', 'sql', 'db'];

    lowerTokens.forEach(token => {
      if (!token) return;
      addToken(token);

      suffixHeuristics.forEach(suffix => {
        if (token.endsWith(suffix) && token.length > suffix.length) {
          addToken(token.slice(0, -suffix.length));
          addToken(suffix);
        }
      });

      const alphaNumericSplit = token
        .replace(/([0-9]+)([a-z]+)/gi, '$1 $2')
        .replace(/([a-z]+)([0-9]+)/gi, '$1 $2');
      alphaNumericSplit.split(/\s+/).forEach(part => {
        if (part && part !== token) {
          addToken(part);
        }
      });
    });

    const uniqueLowerTokens = expandedTokens;

    const normalized = uniqueLowerTokens.join(' ');
    const lowerTrimmed = trimmed.toLowerCase();
    const lowerNormalized = normalized.toLowerCase();
    const condensedTrimmed = lowerTrimmed.replace(/[^\p{L}\p{N}]/gu, '');
    const condensedNormalized = lowerNormalized.replace(/[^\p{L}\p{N}]/gu, '');

    const embeddingText = normalized || whitespaceNormalized || trimmed;

    return {
      trimmed,
      normalized,
      lowerTrimmed,
      lowerNormalized,
      condensedTrimmed,
      condensedNormalized,
      tokens,
      lowerTokens: uniqueLowerTokens,
      embeddingText,
    };
  }

  async vectorSearch(
    options: VectorSearchOptions,
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now();
    // Only increment totalSearches if not an internal call from hybridSearch
    if (!options.isInternalCall) {
      this.metrics.totalSearches++;
    }
    this.metrics.vectorSearches++;

    const {
      query,
      limit = 10,
      threshold = SEARCH_THRESHOLDS.VECTOR_SEARCH,
      filters = {},
    } = options;

    // Check cache first
    const cacheKey = this.getSearchCacheKey('vector', options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    const variants = this.prepareQueryVariants(query);
    const embeddingInput = variants.embeddingText || query;

    // Generate query embedding
    const queryEmbedding =
      await this.embeddingService.generateEmbedding(embeddingInput);

    // Build base WHERE clause for document filters
    const documentFilters: any = {
      isApproved: filters.isApproved ?? true,
      moderationStatus: DocumentModerationStatus.APPROVED,
    };

    if (filters.isPublic !== undefined) {
      documentFilters.isPublic = filters.isPublic;
    }

    if (filters.categoryId) {
      // Get child categories to include documents from sub-categories
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: filters.categoryId, isActive: true },
        select: { id: true },
      });

      const categoryIds = [
        filters.categoryId,
        ...childCategories.map(c => c.id),
      ];

      documentFilters.categoryId = { in: categoryIds };
    }

    if (filters.tags && filters.tags.length > 0) {
      documentFilters.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.language) {
      documentFilters.language = filters.language;
    }

    // Get documents with embeddings that match filters
    // We need to use raw SQL for pgvector operators
    const documentsWithFilters = await this.prisma.document.findMany({
      where: documentFilters,
      select: {
        id: true,
      },
    });

    if (documentsWithFilters.length === 0) {
      return [];
    }

    const documentIds = documentsWithFilters.map(d => d.id);

    // Perform vector similarity search using raw SQL
    // pgvector uses <=> operator for cosine distance
    // We convert distance to similarity: similarity = 1 - distance
    // Convert queryEmbedding array to PostgreSQL vector format
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    let searchResults: VectorSearchResult[] = [];

    try {
      const results = await this.prisma.$queryRaw<
        Array<{
          documentId: string;
          similarityScore: number;
        }>
      >`
					SELECT
						de."documentId" AS "documentId",
						1 - (de.embedding <=> ${embeddingString}::vector) AS "similarityScore"
					FROM document_embeddings de
					WHERE
						de."documentId" = ANY(${documentIds}::text[])
						AND 1 - (de.embedding <=> ${embeddingString}::vector) >= ${threshold}
					ORDER BY de.embedding <=> ${embeddingString}::vector
					LIMIT ${limit}
				`;

      searchResults = results.map(result => ({
        documentId: result.documentId,
        similarityScore: Number(result.similarityScore),
      }));
    } catch (error) {
      // Fallback if pgvector extension (vector type) is not available
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.meta?.code === '42704'
      ) {
        searchResults = await this.computeSimilarityFallback(
          queryEmbedding,
          documentIds,
          threshold,
          limit,
        );
      } else {
        throw error;
      }
    }

    // Cache the results
    this.cacheResults(cacheKey, searchResults);

    // Save search history
    if (options.userId && options.recordHistory !== false) {
      await this.saveSearchHistory(options, queryEmbedding, searchResults);
    }

    // Update metrics
    const latency = Date.now() - startTime;
    this.updateMetrics(latency);

    return searchResults;
  }

  private async computeSimilarityFallback(
    queryEmbedding: number[],
    documentIds: string[],
    threshold: number,
    limit: number,
  ): Promise<VectorSearchResult[]> {
    const embeddingsMap =
      await this.embeddingStorage.getEmbeddings(documentIds);

    const results: VectorSearchResult[] = [];

    embeddingsMap.forEach((embedding, documentId) => {
      if (!embedding || embedding.length === 0) {
        return;
      }

      const similarity = cosineSimilarity(queryEmbedding, embedding);
      if (Number.isFinite(similarity) && similarity >= threshold) {
        results.push({
          documentId,
          similarityScore: similarity,
        });
      }
    });

    return results
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  async hybridSearch(
    options: VectorSearchOptions,
    vectorWeight = HYBRID_SEARCH_WEIGHTS.VECTOR_WEIGHT,
  ): Promise<HybridSearchResult[]> {
    const startTime = Date.now();
    this.metrics.totalSearches++;
    this.metrics.hybridSearches++;

    try {
      const { query, limit = 10 } = options;

      // Check cache first
      const cacheKey = this.getSearchCacheKey('hybrid', options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }

      const variants = this.prepareQueryVariants(query);

      // Perform both searches in parallel
      // Mark as internal calls to prevent double counting metrics
      let vectorResults: VectorSearchResult[] = [];
      let textResults: Array<{ documentId: string; textScore: number }> = [];

      try {
        [vectorResults, textResults] = await Promise.all([
          this.vectorSearch({
            ...options,
            query: variants.embeddingText || variants.trimmed,
            limit: limit * 2, // Get more results for better combination
            recordHistory: false,
            isInternalCall: true,
          }).catch(() => {
            return [];
          }),
          this.keywordSearch({
            ...options,
            query: variants.trimmed,
            isInternalCall: true,
          }).catch(() => {
            return [];
          }),
        ]);
      } catch {
        // Continue with empty results - will return empty array
      }

      // Combine results
      const combinedMap = new Map<string, HybridSearchResult>();

      // Helper function to calculate boost for high-quality vector matches
      const calculateVectorBoost = (vectorScore: number): number => {
        // Apply exponential boost for high-quality embeddings
        // Scores > 0.7 get progressively higher boost
        if (vectorScore >= 0.9) return 1.15; // 15% boost for excellent matches
        if (vectorScore >= 0.8) return 1.1; // 10% boost for very good matches
        if (vectorScore >= 0.7) return 1.05; // 5% boost for good matches
        return 1.0; // No boost for lower scores
      };

      // Add vector results with boost applied
      vectorResults.forEach(result => {
        const boost = calculateVectorBoost(result.similarityScore);
        // For pure vector results, use boosted score to favor embedding matches
        combinedMap.set(result.documentId, {
          documentId: result.documentId,
          vectorScore: result.similarityScore,
          combinedScore: result.similarityScore * vectorWeight * boost,
        });
      });

      // Add/update with text results
      textResults.forEach(result => {
        const existing = combinedMap.get(result.documentId);
        if (existing) {
          existing.textScore = result.textScore;
          // Apply boost to vector component in combined score
          const boost = calculateVectorBoost(existing.vectorScore!);
          existing.combinedScore =
            existing.vectorScore! * vectorWeight * boost +
            result.textScore * (1 - vectorWeight);
        } else {
          combinedMap.set(result.documentId, {
            documentId: result.documentId,
            textScore: result.textScore,
            combinedScore: result.textScore * (1 - vectorWeight),
          });
        }
      });

      // Sort by combined score and limit
      const combinedResults = Array.from(combinedMap.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

      // Cache the results
      this.cacheResults(cacheKey, combinedResults);

      // Save search history (non-blocking)
      if (options.userId) {
        try {
          const historyEmbeddingQuery =
            variants.embeddingText || variants.trimmed || query;
          const queryEmbedding = await this.embeddingService.generateEmbedding(
            historyEmbeddingQuery,
          );
          const highestScore = combinedResults[0]?.combinedScore || 0;

          await this.saveSearchHistory(
            {
              ...options,
              query: variants.trimmed,
              // Mark as hybrid
            },
            queryEmbedding,
            combinedResults.map(r => ({
              documentId: r.documentId,
              similarityScore: r.combinedScore,
            })),
            'hybrid',
            highestScore,
          );
        } catch {
          // Don't fail the search if history saving fails
        }
      }

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(latency);

      return combinedResults;
    } catch (error) {
      this.logger.error(
        `Failed to perform hybrid search: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Không thể thực hiện tìm kiếm');
    }
  }

  async keywordSearch(
    options: VectorSearchOptions,
  ): Promise<Array<{ documentId: string; textScore: number }>> {
    const startTime = Date.now();
    // Only increment totalSearches if not an internal call from hybridSearch
    if (!options.isInternalCall) {
      this.metrics.totalSearches++;
    }
    this.metrics.keywordSearches++;

    const { query, limit = 10, filters = {} } = options;

    const variants = this.prepareQueryVariants(query);
    const lowerQuery = variants.lowerTrimmed;
    const lowerQueryWithoutPunctuation =
      variants.lowerNormalized || variants.lowerTrimmed;
    const hasLowerQuery = lowerQuery.length > 0;
    const hasLowerNormalized = lowerQueryWithoutPunctuation.length > 0;
    const tokens = variants.lowerTokens;

    const baseFilters: Prisma.DocumentWhereInput = {
      isApproved: filters.isApproved ?? true,
      moderationStatus: DocumentModerationStatus.APPROVED,
    };

    if (filters.isPublic !== undefined) {
      baseFilters.isPublic = filters.isPublic;
    }

    if (filters.categoryId) {
      // Get child categories to include documents from sub-categories
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: filters.categoryId, isActive: true },
        select: { id: true },
      });

      const categoryIds = [
        filters.categoryId,
        ...childCategories.map(c => c.id),
      ];

      baseFilters.categoryId = { in: categoryIds };
    }

    if (filters.language) {
      baseFilters.language = filters.language;
    }

    if (filters.tags && filters.tags.length > 0) {
      baseFilters.tags = {
        hasSome: filters.tags,
      };
    }

    const orConditions: Prisma.DocumentWhereInput[] = [];

    const pushContainsConditions = (value: string) => {
      if (!value) return;

      orConditions.push(
        {
          title: {
            contains: value,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: value,
            mode: 'insensitive',
          },
        },
        {
          aiAnalysis: {
            is: {
              summary: {
                contains: value,
                mode: 'insensitive',
              },
            },
          },
        },
      );
    };

    pushContainsConditions(variants.lowerTrimmed);
    if (
      variants.lowerNormalized &&
      variants.lowerNormalized !== variants.lowerTrimmed
    ) {
      pushContainsConditions(variants.lowerNormalized);
    }

    tokens.forEach(token => {
      if (!token) return;
      pushContainsConditions(token);
    });

    const documentFilters: Prisma.DocumentWhereInput = {
      ...baseFilters,
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    };

    let documents = await this.prisma.document.findMany({
      where: documentFilters,
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        aiAnalysis: {
          select: {
            summary: true,
            keyPoints: true,
            suggestedTags: true,
          },
        },
      },
      take: limit * 3,
    });

    if (documents.length === 0) {
      documents = await this.prisma.document.findMany({
        where: baseFilters,
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          aiAnalysis: {
            select: {
              summary: true,
              keyPoints: true,
              suggestedTags: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: Math.min(limit * 5, 100),
      });
    }

    const condensed = (value: string) =>
      value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const condensedQuery = variants.condensedTrimmed;
    const condensedQueryWithoutPunctuation = variants.condensedNormalized;

    const tokenCoverage = (source: string) => {
      if (tokens.length === 0) return 0;
      const lowerSource = source.toLowerCase();
      return (
        tokens.filter(token => lowerSource.includes(token)).length /
        tokens.length
      );
    };

    const results = documents.map(doc => {
      const titleLower = doc.title.toLowerCase();
      const descriptionLower = doc.description?.toLowerCase() ?? '';
      const summaryLower = doc.aiAnalysis?.summary?.toLowerCase() ?? '';
      const keyPointsLower =
        doc.aiAnalysis?.keyPoints?.map(point => point.toLowerCase()) ?? [];
      const suggestedTagsLower =
        doc.aiAnalysis?.suggestedTags?.map(tag => tag.toLowerCase()) ?? [];
      const tagsLower = doc.tags.map(tag => tag.toLowerCase());

      const tagsCombined = tagsLower.join(' ');
      const keyPointsCombined = keyPointsLower.join(' ');
      const suggestedCombined = suggestedTagsLower.join(' ');

      const titleScore = Math.max(
        hasLowerQuery && titleLower.includes(lowerQuery) ? 1 : 0,
        hasLowerNormalized && titleLower.includes(lowerQueryWithoutPunctuation)
          ? 1
          : 0,
        condensedQuery.length > 0 &&
          condensed(doc.title).includes(condensedQuery)
          ? 1
          : 0,
        condensedQueryWithoutPunctuation.length > 0 &&
          condensed(doc.title).includes(condensedQueryWithoutPunctuation)
          ? 1
          : 0,
        tokenCoverage(doc.title),
      );

      const descriptionScore = Math.max(
        hasLowerQuery && descriptionLower.includes(lowerQuery) ? 1 : 0,
        hasLowerNormalized &&
          descriptionLower.includes(lowerQueryWithoutPunctuation)
          ? 1
          : 0,
        condensedQuery.length > 0 &&
          condensed(descriptionLower).includes(condensedQuery)
          ? 1
          : 0,
        condensedQueryWithoutPunctuation.length > 0 &&
          condensed(descriptionLower).includes(condensedQueryWithoutPunctuation)
          ? 1
          : 0,
        tokenCoverage(descriptionLower),
      );

      const summaryScore = Math.max(
        hasLowerQuery && summaryLower.includes(lowerQuery) ? 1 : 0,
        hasLowerNormalized &&
          summaryLower.includes(lowerQueryWithoutPunctuation)
          ? 1
          : 0,
        condensedQuery.length > 0 &&
          condensed(summaryLower).includes(condensedQuery)
          ? 1
          : 0,
        condensedQueryWithoutPunctuation.length > 0 &&
          condensed(summaryLower).includes(condensedQueryWithoutPunctuation)
          ? 1
          : 0,
        tokenCoverage(summaryLower),
      );

      const tagScore = Math.max(
        hasLowerQuery && tagsCombined.includes(lowerQuery) ? 1 : 0,
        hasLowerNormalized &&
          tagsCombined.includes(lowerQueryWithoutPunctuation)
          ? 1
          : 0,
        condensedQuery.length > 0 &&
          condensed(tagsCombined).includes(condensedQuery)
          ? 1
          : 0,
        condensedQueryWithoutPunctuation.length > 0 &&
          condensed(tagsCombined).includes(condensedQueryWithoutPunctuation)
          ? 1
          : 0,
        tokenCoverage(tagsCombined),
      );

      const keyPointScore = Math.max(
        hasLowerQuery && keyPointsCombined.includes(lowerQuery) ? 1 : 0,
        hasLowerNormalized &&
          keyPointsCombined.includes(lowerQueryWithoutPunctuation)
          ? 1
          : 0,
        condensedQuery.length > 0 &&
          condensed(keyPointsCombined).includes(condensedQuery)
          ? 1
          : 0,
        condensedQueryWithoutPunctuation.length > 0 &&
          condensed(keyPointsCombined).includes(
            condensedQueryWithoutPunctuation,
          )
          ? 1
          : 0,
        tokenCoverage(keyPointsCombined),
      );

      const suggestedTagScore = Math.max(
        hasLowerQuery && suggestedCombined.includes(lowerQuery) ? 1 : 0,
        hasLowerNormalized &&
          suggestedCombined.includes(lowerQueryWithoutPunctuation)
          ? 1
          : 0,
        condensedQuery.length > 0 &&
          condensed(suggestedCombined).includes(condensedQuery)
          ? 1
          : 0,
        condensedQueryWithoutPunctuation.length > 0 &&
          condensed(suggestedCombined).includes(
            condensedQueryWithoutPunctuation,
          )
          ? 1
          : 0,
        tokenCoverage(suggestedCombined),
      );

      const textScore = Math.min(
        1,
        titleScore * KEYWORD_SCORE_WEIGHTS.TITLE +
          descriptionScore * KEYWORD_SCORE_WEIGHTS.DESCRIPTION +
          summaryScore * KEYWORD_SCORE_WEIGHTS.SUMMARY +
          keyPointScore * KEYWORD_SCORE_WEIGHTS.KEY_POINTS +
          tagScore * KEYWORD_SCORE_WEIGHTS.TAGS +
          suggestedTagScore * KEYWORD_SCORE_WEIGHTS.SUGGESTED_TAGS,
      );

      return {
        documentId: doc.id,
        textScore,
      };
    });

    const filteredResults = results
      .filter(r => r.textScore > 0)
      .sort((a, b) => b.textScore - a.textScore)
      .slice(0, limit);

    // Update metrics with latency
    const latency = Date.now() - startTime;
    if (!options.isInternalCall) {
      this.updateMetrics(latency);
    }

    return filteredResults;
  }

  private async saveSearchHistory(
    options: VectorSearchOptions,
    queryEmbedding: number[],
    results: VectorSearchResult[],
    searchMethod = 'vector',
    highestScore?: number,
  ): Promise<void> {
    try {
      if (!options.userId) return;

      // Use raw SQL to properly insert vector type
      // pgvector requires format [0.1, 0.2, ...] not {"0.1", "0.2", ...}
      const vectorString = `[${queryEmbedding.join(',')}]`;
      const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 11)}`;
      const score = highestScore ?? results[0]?.similarityScore ?? null;
      const filtersJson = JSON.stringify(options.filters || {});

      await this.prisma.$executeRaw`
        INSERT INTO search_history (id, "userId", query, "queryEmbedding", "searchMethod", "vectorScore", "resultsCount", filters, "searchedAt")
        VALUES (
          ${id},
          ${options.userId},
          ${options.query},
          ${vectorString}::vector,
          ${searchMethod},
          ${score},
          ${results.length},
          ${filtersJson}::jsonb,
          NOW()
        )
      `;
    } catch {
      // Don't throw - search history is not critical
    }
  }

  private getSearchCacheKey(
    type: string,
    options: VectorSearchOptions,
  ): string {
    const filterStr = JSON.stringify(options.filters || {});
    return `${type}:${options.query}:${filterStr}:${options.limit || 10}:${options.threshold || 0.5}`;
  }

  private getFromCache(key: string): any {
    const cached = this.searchCache.get(key);
    if (!cached) return null;

    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cacheResults(key: string, data: any): void {
    // Implement LRU-like behavior
    if (this.searchCache.size >= this.maxCacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    this.searchCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private updateMetrics(latency: number): void {
    const totalSearches = this.metrics.totalSearches;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (totalSearches - 1) + latency) /
      totalSearches;
  }

  getMetrics(): SearchMetrics {
    return { ...this.metrics };
  }

  clearCache(): void {
    this.searchCache.clear();
  }

  async getDocumentsByIds(documentIds: string[]): Promise<any[]> {
    const documents = await this.prisma.document.findMany({
      where: {
        id: {
          in: documentIds,
        },
      },
      include: {
        files: {
          include: {
            file: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        category: true,
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return documents;
  }
}
