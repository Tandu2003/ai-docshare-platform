export const HTTP_STATUS = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 4xx Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export const HTTP_MESSAGES = {
  SUCCESS: 'Thành công',
  CREATED: 'Tài nguyên đã được tạo thành công',
  UPDATED: 'Tài nguyên đã được cập nhật thành công',
  DELETED: 'Tài nguyên đã được xóa thành công',
  DATA_RETRIEVED: 'Dữ liệu đã được truy xuất thành công',

  BAD_REQUEST: 'Yêu cầu không hợp lệ',
  UNAUTHORIZED: 'Không được ủy quyền',
  FORBIDDEN: 'Bị cấm',
  NOT_FOUND: 'Không tìm thấy tài nguyên',
  VALIDATION_FAILED: 'Xác thực thất bại',
  CONFLICT: 'Xung đột',
  TOO_MANY_REQUESTS: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
  INTERNAL_ERROR: 'Lỗi máy chủ nội bộ',
} as const;
