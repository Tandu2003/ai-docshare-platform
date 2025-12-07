export interface AIAnalysisRequest {
  readonly fileIds: string[];
  readonly userId: string;
}
export interface AIAnalysisResponse {
  readonly success: boolean;
  readonly data: DocumentAnalysisData;
  readonly processedFiles: number;
  readonly processingTime: number;
}

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

export interface EmbeddingMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageLatency: number;
  readonly cacheHits: number;
}

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

export interface VectorSearchFilters {
  readonly categoryId?: string;
  readonly tags?: string[];
  readonly language?: string;
  readonly isPublic?: boolean;
  readonly isApproved?: boolean;
}

export interface VectorSearchResult {
  readonly documentId: string;
  readonly similarityScore: number;
}

export interface HybridSearchResult {
  readonly documentId: string;
  readonly vectorScore?: number;
  readonly textScore?: number;
  readonly combinedScore: number;
}

export interface SearchMetrics {
  totalSearches: number;
  vectorSearches: number;
  keywordSearches: number;
  hybridSearches: number;
  averageLatency: number;
  cacheHits: number;
}

// Types (Unions, Enums-like)

export type DocumentDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ModerationAction = 'approve' | 'review' | 'reject';
