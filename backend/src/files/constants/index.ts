/**
 * Files Module - Constants
 */

// ============================================================================
// File Size Limits
// ============================================================================

export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

// ============================================================================
// Allowed MIME Types
// ============================================================================

export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/markdown',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
] as const;

// ============================================================================
// Storage Paths
// ============================================================================

export const STORAGE_PATHS = {
  UPLOADS: 'uploads',
  PREVIEWS: 'previews',
  THUMBNAILS: 'thumbnails',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const FILE_ERROR_MESSAGES = {
  NOT_FOUND: 'Không tìm thấy tệp',
  INVALID_TYPE: 'Loại tệp không được hỗ trợ',
  TOO_LARGE: 'Kích thước tệp vượt quá giới hạn cho phép',
  UPLOAD_FAILED: 'Không thể tải lên tệp',
  DELETE_FAILED: 'Không thể xóa tệp',
  ACCESS_DENIED: 'Không có quyền truy cập tệp này',
  DUPLICATE: 'Tệp này đã tồn tại',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const FILE_SUCCESS_MESSAGES = {
  UPLOADED: 'Tải lên tệp thành công',
  DELETED: 'Xóa tệp thành công',
} as const;

// ============================================================================
// Type exports
// ============================================================================

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type StoragePath = (typeof STORAGE_PATHS)[keyof typeof STORAGE_PATHS];
