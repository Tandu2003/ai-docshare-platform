export const DEFAULT_UPLOAD_REWARD = 5;
export const DEFAULT_DOWNLOAD_COST = 1;
export const DEFAULT_DOWNLOAD_REWARD = 1;
export const INITIAL_USER_POINTS = 10;
export const POINT_TRANSACTION_TYPES = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
} as const;
// Transaction Reasons
export const POINT_TRANSACTION_REASONS = {
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
  DOWNLOAD_REWARD: 'DOWNLOAD_REWARD',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  BONUS: 'BONUS',
  PENALTY: 'PENALTY',
  REFUND: 'REFUND',
} as const;

// Error Messages

export const POINTS_ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: 'Số dư điểm không đủ',
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  INVALID_AMOUNT: 'Số điểm không hợp lệ',
  TRANSACTION_FAILED: 'Giao dịch thất bại',
  CANNOT_DOWNLOAD_OWN: 'Bạn không thể tải xuống tài liệu của chính mình',
} as const;

// Success Messages

export const POINTS_SUCCESS_MESSAGES = {
  POINTS_AWARDED: 'Đã cộng điểm thành công',
  POINTS_DEDUCTED: 'Đã trừ điểm thành công',
  ADJUSTMENT_COMPLETE: 'Điều chỉnh điểm hoàn tất',
} as const;

// Pagination

export const DEFAULT_TRANSACTIONS_PAGE = 1;
export const DEFAULT_TRANSACTIONS_LIMIT = 10;
export const MAX_TRANSACTIONS_LIMIT = 100;
