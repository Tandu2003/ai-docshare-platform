/**
 * Users Module - Constants
 */

// ============================================================================
// Pagination Constants
// ============================================================================

export const DEFAULT_USERS_PAGE = 1;
export const DEFAULT_USERS_LIMIT = 10;
export const MAX_USERS_LIMIT = 100;

// ============================================================================
// Sort Options
// ============================================================================

export const USERS_SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  EMAIL: 'email',
  USERNAME: 'username',
} as const;

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const USER_ERROR_MESSAGES = {
  NOT_FOUND: 'Không tìm thấy người dùng',
  EMAIL_EXISTS: 'Email đã tồn tại',
  USERNAME_EXISTS: 'Tên đăng nhập đã tồn tại',
  CANNOT_DELETE_SELF: 'Bạn không thể xóa tài khoản của chính mình',
  CANNOT_MODIFY_ADMIN: 'Không thể sửa đổi tài khoản admin',
  ROLE_NOT_FOUND: 'Không tìm thấy vai trò',
  INVALID_STATUS: 'Trạng thái không hợp lệ',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const USER_SUCCESS_MESSAGES = {
  CREATED: 'Tạo người dùng thành công',
  UPDATED: 'Cập nhật người dùng thành công',
  DELETED: 'Xóa người dùng thành công',
  RESTORED: 'Khôi phục người dùng thành công',
  ROLE_UPDATED: 'Cập nhật vai trò người dùng thành công',
  STATUS_UPDATED: 'Cập nhật trạng thái người dùng thành công',
} as const;

// ============================================================================
// Type exports
// ============================================================================

export type UsersSortField =
  (typeof USERS_SORT_FIELDS)[keyof typeof USERS_SORT_FIELDS];
export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];
