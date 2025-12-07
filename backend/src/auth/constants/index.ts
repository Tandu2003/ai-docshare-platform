export const JWT_ACCESS_TOKEN_EXPIRY = '15m';
export const JWT_REFRESH_TOKEN_EXPIRY = '7d';
// Password Constants
export const PASSWORD_SALT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
// Token Constants
export const VERIFICATION_TOKEN_LENGTH = 32;
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
export const RESET_TOKEN_LENGTH = 32;
export const RESET_TOKEN_EXPIRY_HOURS = 1;

// Rate Limiting Constants

export const AUTH_RATE_LIMITS = {
  LOGIN: { limit: 10, ttl: 60000 }, // 10 per minute
  REGISTER: { limit: 5, ttl: 60000 }, // 5 per minute
  REFRESH: { limit: 20, ttl: 60000 }, // 20 per minute
  FORGOT_PASSWORD: { limit: 3, ttl: 60000 }, // 3 per minute
  VERIFY_EMAIL: { limit: 5, ttl: 60000 }, // 5 per minute
} as const;

// Role Constants

export const DEFAULT_ROLE_NAME = 'user';
export const ADMIN_ROLE_NAME = 'admin';

export const ROLE_NAMES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

// Error Messages

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Thông tin đăng nhập không hợp lệ',
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  USER_NOT_VERIFIED: 'Tài khoản chưa được xác thực',
  USER_INACTIVE: 'Tài khoản đã bị vô hiệu hóa',
  EMAIL_EXISTS: 'Email đã tồn tại',
  USERNAME_EXISTS: 'Tên đăng nhập đã tồn tại',
  INVALID_TOKEN: 'Token không hợp lệ hoặc đã hết hạn',
  PASSWORD_MISMATCH: 'Mật khẩu hiện tại không chính xác',
  REFRESH_TOKEN_MISSING: 'Không tìm thấy mã làm mới',
  UNAUTHORIZED: 'Không được ủy quyền',
  FORBIDDEN: 'Không có quyền truy cập',
} as const;

// Success Messages

export const AUTH_SUCCESS_MESSAGES = {
  REGISTERED:
    'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
  LOGGED_IN: 'Đăng nhập thành công',
  LOGGED_OUT: 'Đăng xuất thành công',
  TOKEN_REFRESHED: 'Mã truy cập đã được làm mới thành công',
  EMAIL_VERIFIED: 'Email đã được xác thực thành công',
  PASSWORD_RESET: 'Mật khẩu đã được đặt lại thành công',
  PASSWORD_CHANGED: 'Mật khẩu đã được thay đổi thành công',
  PROFILE_UPDATED: 'Thông tin hồ sơ đã được cập nhật thành công',
  VERIFICATION_SENT: 'Email xác thực đã được gửi lại',
} as const;

// Type exports

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
