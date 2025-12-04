/**
 * Categories Module - Constants
 */

// ============================================================================
// Default Categories
// ============================================================================

export const DEFAULT_CATEGORY_NAME = 'Uncategorized';
export const DEFAULT_CATEGORY_DESCRIPTION = 'Tài liệu chưa được phân loại';

// ============================================================================
// Error Messages
// ============================================================================

export const CATEGORY_ERROR_MESSAGES = {
  NOT_FOUND: 'Không tìm thấy danh mục',
  NAME_EXISTS: 'Tên danh mục đã tồn tại',
  HAS_DOCUMENTS: 'Không thể xóa danh mục đang chứa tài liệu',
  HAS_CHILDREN: 'Không thể xóa danh mục đang có danh mục con',
  INVALID_PARENT: 'Danh mục cha không hợp lệ',
  CIRCULAR_REFERENCE: 'Không thể tạo tham chiếu vòng tròn',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const CATEGORY_SUCCESS_MESSAGES = {
  CREATED: 'Tạo danh mục thành công',
  UPDATED: 'Cập nhật danh mục thành công',
  DELETED: 'Xóa danh mục thành công',
  REORDERED: 'Sắp xếp danh mục thành công',
} as const;

// ============================================================================
// Limits
// ============================================================================

export const MAX_CATEGORY_DEPTH = 3;
export const MAX_CATEGORY_NAME_LENGTH = 100;
