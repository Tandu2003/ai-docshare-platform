/**
 * Search and Similarity Constants
 *
 * Centralized configuration for vector search and document similarity detection.
 * All weights and thresholds should be defined here to ensure consistency.
 */

// ============================================
// VECTOR SEARCH CONFIGURATION
// ============================================

/**
 * Hybrid Search Weights
 * - VECTOR_WEIGHT: Weight for vector similarity (semantic meaning)
 * - TEXT_WEIGHT: Weight for keyword/text matching
 * Total must equal 1.0
 */
export const HYBRID_SEARCH_WEIGHTS = {
  /** Weight for vector/embedding similarity in hybrid search */
  VECTOR_WEIGHT: 0.8,
  /** Weight for text/keyword matching in hybrid search */
  TEXT_WEIGHT: 0.2,
} as const;

/**
 * Search Score Thresholds
 * Minimum scores required for results to be included
 */
export const SEARCH_THRESHOLDS = {
  /** Minimum similarity score for vector search results (0-1) */
  VECTOR_SEARCH: 0.5,
  /** Minimum similarity score for hybrid search results (0-1) */
  HYBRID_SEARCH: 0.35,
  /** Minimum text score for keyword search results (0-1) */
  KEYWORD_SEARCH: 0.1,
} as const;

/**
 * Keyword Search Score Weights
 * How different document fields contribute to text matching score
 * Total must equal 1.0
 */
export const KEYWORD_SCORE_WEIGHTS = {
  /** Title match weight */
  TITLE: 0.35,
  /** Description match weight */
  DESCRIPTION: 0.2,
  /** AI summary match weight */
  SUMMARY: 0.25,
  /** Key points match weight */
  KEY_POINTS: 0.1,
  /** Tags match weight */
  TAGS: 0.05,
  /** Suggested tags match weight */
  SUGGESTED_TAGS: 0.05,
} as const;

// ============================================
// SIMILARITY DETECTION CONFIGURATION
// ============================================

/**
 * Combined Similarity Score Weights
 * How different similarity methods contribute to final score
 * Used in document similarity detection
 */
export const SIMILARITY_SCORE_WEIGHTS = {
  /** Weight for file hash comparison */
  HASH: 0.3,
  /** Weight for text content similarity */
  TEXT: 0.2,
  /** Weight for embedding/vector similarity */
  EMBEDDING: 0.5,
} as const;

/**
 * Similarity Detection Thresholds
 * Thresholds for determining document similarity
 */
export const SIMILARITY_THRESHOLDS = {
  /** Threshold for considering documents as similar (0-1) */
  SIMILARITY_DETECTION: 0.85,
  /** Threshold for embedding similarity alone to trigger match (0-1) */
  EMBEDDING_MATCH: 0.7,
  /** Threshold for hash similarity to consider as near-exact match (0-1) */
  HASH_MATCH: 0.9,
  /** Hash similarity threshold to include in results (0-1) */
  HASH_INCLUDE: 0.5,
} as const;

// ============================================
// EMBEDDING CONFIGURATION
// ============================================

/**
 * Embedding Text Configuration
 * Limits for text content used in embedding generation
 */
export const EMBEDDING_TEXT_LIMITS = {
  /** Maximum characters from file content for embedding */
  MAX_FILE_CONTENT_CHARS: 5000,
  /** Maximum total characters for embedding input */
  MAX_TOTAL_CHARS: 8000,
} as const;

// ============================================
// CACHE CONFIGURATION
// ============================================

export const SEARCH_CACHE_CONFIG = {
  /** Maximum number of cached search results */
  MAX_SIZE: 500,
  /** Cache TTL in milliseconds (5 minutes) */
  TTL_MS: 5 * 60 * 1000,
} as const;

export const EMBEDDING_CACHE_CONFIG = {
  /** Maximum number of cached embeddings */
  MAX_SIZE: 1000,
} as const;

// ============================================
// LIMITS
// ============================================

export const SEARCH_LIMITS = {
  /** Default search results per page */
  DEFAULT_PAGE_SIZE: 10,
  /** Maximum search results to fetch */
  MAX_FETCH_LIMIT: 100,
  /** Maximum similar documents to return */
  MAX_SIMILAR_DOCUMENTS: 10,
} as const;
