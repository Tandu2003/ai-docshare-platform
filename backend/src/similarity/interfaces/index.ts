export interface SimilarDocument {
  readonly documentId: string;
  readonly title: string;
  readonly similarity: number;
  readonly uploaderId: string;
  readonly uploaderName: string;
  readonly createdAt: Date;
}
export interface SimilarityCheckResult {
  readonly documentId: string;
  readonly hasSimilar: boolean;
  readonly maxSimilarity: number;
  readonly similarDocuments: SimilarDocument[];
}

export interface SimilarityJobStatus {
  readonly jobId: string;
  readonly documentId: string;
  readonly status: SimilarityJobStatusType;
  readonly progress: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly error: string | null;
}

export type SimilarityJobStatusType =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';
