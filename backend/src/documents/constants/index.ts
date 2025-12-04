/**
 * Document Module - Constants
 *
 * Following Clean Code Commandment #6: Single Source of Truth
 * All document-related constants are defined here.
 * Using SCREAMING_SNAKE_CASE as per TypeScript Coding Standards.
 */

// ============================================================================
// Pagination Constants
// ============================================================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

// ============================================================================
// Download Constants
// ============================================================================

export const DOWNLOAD_LINK_EXPIRY_HOURS = 24;
export const MAX_DOWNLOAD_RETRIES = 3;
export const DOWNLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB

// ============================================================================
// Share Link Constants
// ============================================================================

export const DEFAULT_SHARE_LINK_EXPIRY_DAYS = 7;
export const MAX_SHARE_LINK_EXPIRY_DAYS = 365;
export const SHARE_LINK_TOKEN_LENGTH = 32;

// ============================================================================
// Moderation Constants
// ============================================================================

export const MODERATION_THRESHOLDS = {
  AUTO_APPROVE: 80,
  AUTO_REJECT: 30,
  SIMILARITY_REJECT: 90,
  SIMILARITY_REVIEW: 70,
} as const;

export const MODERATION_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// ============================================================================
// File Constants
// ============================================================================

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_FILES_PER_DOCUMENT = 10;

// ============================================================================
// Rating Constants
// ============================================================================

export const MIN_RATING = 1;
export const MAX_RATING = 5;

// ============================================================================
// Comment Constants
// ============================================================================

export const MAX_COMMENT_LENGTH = 5000;
export const MAX_COMMENT_DEPTH = 3;

// ============================================================================
// Search Constants
// ============================================================================

export const SEARCH_DEFAULTS = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 500,
  VECTOR_SEARCH_THRESHOLD: 0.5,
  HYBRID_SEARCH_WEIGHT_VECTOR: 0.7,
  HYBRID_SEARCH_WEIGHT_TEXT: 0.3,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const DOCUMENT_ERROR_MESSAGES = {
  NOT_FOUND: 'Không tìm thấy tài liệu',
  ACCESS_DENIED: 'Bạn không có quyền truy cập tài liệu này',
  ALREADY_EXISTS: 'Tài liệu đã tồn tại',
  INVALID_FILE: 'File không hợp lệ',
  FILE_TOO_LARGE: 'Kích thước file vượt quá giới hạn cho phép',
  TOO_MANY_FILES: 'Số lượng file vượt quá giới hạn cho phép',
  CATEGORY_NOT_FOUND: 'Không tìm thấy danh mục',
  COMMENT_NOT_FOUND: 'Không tìm thấy bình luận',
  COMMENT_EDIT_DENIED: 'Bạn không có quyền sửa bình luận này',
  COMMENT_DELETE_DENIED: 'Bạn không có quyền xóa bình luận này',
  SHARE_LINK_INVALID: 'Link chia sẻ không hợp lệ hoặc đã hết hạn',
  SHARE_LINK_EXPIRED: 'Link chia sẻ đã hết hạn',
  SHARE_LINK_MAX_DOWNLOADS: 'Link chia sẻ đã đạt số lượt tải xuống tối đa',
  INSUFFICIENT_POINTS: 'Không đủ điểm để tải xuống tài liệu',
  DOWNLOAD_FAILED: 'Không thể tải xuống tài liệu',
  MODERATION_PENDING: 'Tài liệu đang chờ kiểm duyệt',
  MODERATION_REJECTED: 'Tài liệu đã bị từ chối',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const DOCUMENT_SUCCESS_MESSAGES = {
  CREATED: 'Tài liệu đã được tạo thành công',
  CREATED_PENDING: 'Tài liệu đã được tạo, vui lòng chờ quản trị viên duyệt',
  UPDATED: 'Tài liệu đã được cập nhật thành công',
  DELETED: 'Tài liệu đã được xóa thành công',
  DOWNLOADED: 'Tải xuống tài liệu thành công',
  SHARED: 'Đã tạo link chia sẻ thành công',
  SHARE_REVOKED: 'Đã hủy link chia sẻ thành công',
  RATED: 'Đã đánh giá tài liệu thành công',
  COMMENTED: 'Đã thêm bình luận thành công',
  APPROVED: 'Tài liệu đã được phê duyệt',
  REJECTED: 'Tài liệu đã bị từ chối',
} as const;

// ============================================================================
// Type exports for type safety
// ============================================================================

export type ModerationStatus =
  (typeof MODERATION_STATUSES)[keyof typeof MODERATION_STATUSES];
export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number];
