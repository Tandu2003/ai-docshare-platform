/**
 * Similarity Module - Interfaces and Types
 */

// ============================================================================
// Similarity Interfaces
// ============================================================================

/**
 * Similar document result
 */
export interface SimilarDocument {
  readonly documentId: string;
  readonly title: string;
  readonly similarity: number;
  readonly uploaderId: string;
  readonly uploaderName: string;
  readonly createdAt: Date;
}

/**
 * Similarity check result
 */
export interface SimilarityCheckResult {
  readonly documentId: string;
  readonly hasSimilar: boolean;
  readonly maxSimilarity: number;
  readonly similarDocuments: SimilarDocument[];
}

/**
 * Similarity job status
 */
export interface SimilarityJobStatus {
  readonly jobId: string;
  readonly documentId: string;
  readonly status: SimilarityJobStatusType;
  readonly progress: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly error: string | null;
}

// ============================================================================
// Types
// ============================================================================

export type SimilarityJobStatusType =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
