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
  /** Semantic similarity weight (embeddings) */
  VECTOR_WEIGHT: 0.65,

  /** Lexical / keyword matching weight */
  TEXT_WEIGHT: 0.35,
} as const;

/**
 * Search Score Thresholds
 * Minimum scores required for results to be included
 */
export const SEARCH_THRESHOLDS = {
  /** Minimum cosine similarity for vector-only search */
  VECTOR_SEARCH: 0.5,

  /** Minimum final score for hybrid search results */
  HYBRID_SEARCH: 0.38,

  /** Minimum normalized score for keyword-only search */
  KEYWORD_SEARCH: 0.3,
} as const;

/**
 * Keyword Search Score Weights
 * How different document fields contribute to text matching score
 * Total must equal 1.0
 */
export const KEYWORD_SCORE_WEIGHTS = {
  /** Document title relevance */
  TITLE: 0.4,

  /** Short description relevance */
  DESCRIPTION: 0.15,

  /** AI-generated summary relevance */
  SUMMARY: 0.25,

  /** Bullet key points relevance */
  KEY_POINTS: 0.1,

  /** User-defined tags relevance */
  TAGS: 0.06,

  /** AI-suggested tags relevance */
  SUGGESTED_TAGS: 0.04,
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
  /** File hash similarity weight */
  HASH: 0.35,

  /** Raw text similarity weight */
  TEXT: 0.2,

  /** Embedding similarity weight */
  EMBEDDING: 0.45,
} as const;

/**
 * Similarity Detection Thresholds
 */
export const SIMILARITY_THRESHOLDS = {
  /** Final combined similarity score to flag documents as similar */
  SIMILARITY_DETECTION: 0.85,

  /** Embedding-only similarity threshold */
  EMBEDDING_MATCH: 0.75,

  /** Near-exact file hash similarity threshold */
  HASH_MATCH: 0.95,

  /** Minimum hash similarity to be considered */
  HASH_INCLUDE: 0.6,
} as const;

// ============================================
// EMBEDDING CONFIGURATION
// ============================================

/**
 * Embedding Text Configuration
 * Limits for text content used in embedding generation
 */
export const EMBEDDING_TEXT_LIMITS = {
  /** Maximum characters extracted from file content */
  MAX_FILE_CONTENT_CHARS: 6000,

  /** Maximum total characters for embedding input */
  MAX_TOTAL_CHARS: 9000,
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
  MAX_SIZE: 1500,
} as const;

// ============================================
// LIMITS
// ============================================

export const SEARCH_LIMITS = {
  /** Default number of results per page */
  DEFAULT_PAGE_SIZE: 5,

  /** Maximum number of results fetched per search */
  MAX_FETCH_LIMIT: 100,

  /** Maximum number of similar documents returned */
  MAX_SIMILAR_DOCUMENTS: 5,
} as const;
