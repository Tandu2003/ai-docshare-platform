export const SIMILARITY_THRESHOLDS = {
  EXACT_MATCH: 95,
  HIGH_SIMILARITY: 80,
  MODERATE_SIMILARITY: 60,
  LOW_SIMILARITY: 40,
} as const;
export const DEFAULT_SIMILARITY_THRESHOLD = 70;
export const AUTO_REJECT_SIMILARITY_THRESHOLD = 90;
// Limits
export const MAX_SIMILAR_DOCUMENTS = 10;
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
