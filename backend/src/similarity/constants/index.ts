// Import for re-export
import { SEARCH_LIMITS } from '@/common';

/**
 * Similarity Constants
 *
 * Note: Core search/similarity constants are now centralized in
 * @/common/constants/search-similarity.constants.ts
 *
 * Re-export centralized constants for backward compatibility.
 */

// Re-export centralized constants
export {
  SIMILARITY_THRESHOLDS,
  SIMILARITY_SCORE_WEIGHTS,
  SEARCH_LIMITS,
} from '@/common';

// Re-export MAX_SIMILAR_DOCUMENTS for backward compatibility
export const MAX_SIMILAR_DOCUMENTS = SEARCH_LIMITS.MAX_SIMILAR_DOCUMENTS;

// Legacy threshold values (percentage-based, for display/UI)
export const SIMILARITY_THRESHOLD_DISPLAY = {
  EXACT_MATCH: 95,
  HIGH_SIMILARITY: 80,
  MODERATE_SIMILARITY: 60,
  LOW_SIMILARITY: 40,
} as const;

export const DEFAULT_SIMILARITY_THRESHOLD = 70;
export const AUTO_REJECT_SIMILARITY_THRESHOLD = 90;

// Batch processing
export const SIMILARITY_BATCH_SIZE = 100;

// Job Constants
export const SIMILARITY_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const SIMILARITY_JOB_RETRY_COUNT = 3;

// Error Messages
export const SIMILARITY_ERROR_MESSAGES = {
  DOCUMENT_NOT_FOUND: 'Không tìm thấy tài liệu',
  CHECK_FAILED: 'Không thể kiểm tra độ tương đồng',
  JOB_NOT_FOUND: 'Không tìm thấy công việc kiểm tra',
  EMBEDDING_FAILED: 'Không thể tạo embedding cho tài liệu',
} as const;
