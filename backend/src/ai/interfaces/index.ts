/**
 * AI Module - Interfaces and Types
 *
 * Following TypeScript Coding Standards:
 * - Use `interface` for extendable object shapes
 * - Use `type` for unions, intersections, utility types
 * - PascalCase for interfaces and types
 */

// ============================================================================
// AI Analysis Interfaces
// ============================================================================

/**
 * Request payload for AI document analysis
 */
export interface AIAnalysisRequest {
  readonly fileIds: string[];
  readonly userId: string;
}

/**
 * Response from AI document analysis
 */
export interface AIAnalysisResponse {
  readonly success: boolean;
  readonly data: DocumentAnalysisData;
  readonly processedFiles: number;
  readonly processingTime: number;
}

/**
 * Document analysis data returned by AI
 */
export interface DocumentAnalysisData {
  readonly title?: string;
  readonly description?: string;
  readonly tags?: string[];
  readonly summary?: string;
  readonly keyPoints?: string[];
  readonly difficulty?: DocumentDifficulty;
  readonly language?: string;
  readonly confidence?: number;
  readonly reliabilityScore?: number;
  readonly moderationScore?: number;
  readonly safetyFlags?: string[];
  readonly isSafe?: boolean;
  readonly recommendedAction?: ModerationAction;
  readonly suggestedCategoryId?: string | null;
  readonly suggestedCategoryName?: string | null;
  readonly categoryConfidence?: number;
}

// ============================================================================
// Embedding Interfaces
// ============================================================================

/**
 * Metrics for embedding service performance
 */
export interface EmbeddingMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageLatency: number;
  readonly cacheHits: number;
}

// ============================================================================
// Vector Search Interfaces
// ============================================================================

/**
 * Options for vector search queries
 */
export interface VectorSearchOptions {
  readonly query: string;
  readonly userId?: string;
  readonly userRole?: string;
  readonly limit?: number;
  readonly threshold?: number;
  readonly recordHistory?: boolean;
  /** Internal flag to prevent double counting metrics */
  readonly isInternalCall?: boolean;
  readonly filters?: VectorSearchFilters;
}

/**
 * Filters for vector search
 */
export interface VectorSearchFilters {
  readonly categoryId?: string;
  readonly tags?: string[];
  readonly language?: string;
  readonly isPublic?: boolean;
  readonly isApproved?: boolean;
}

/**
 * Result from vector similarity search
 */
export interface VectorSearchResult {
  readonly documentId: string;
  readonly similarityScore: number;
}

/**
 * Result from hybrid search (vector + keyword)
 */
export interface HybridSearchResult {
  readonly documentId: string;
  readonly vectorScore?: number;
  readonly textScore?: number;
  readonly combinedScore: number;
}

/**
 * Metrics for search service performance
 */
export interface SearchMetrics {
  totalSearches: number;
  vectorSearches: number;
  keywordSearches: number;
  hybridSearches: number;
  averageLatency: number;
  cacheHits: number;
}

// ============================================================================
// Types (Unions, Enums-like)
// ============================================================================

/**
 * Document difficulty levels
 */
export type DocumentDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * AI-recommended moderation actions
 */
export type ModerationAction = 'approve' | 'review' | 'reject';
