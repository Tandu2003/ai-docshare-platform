export const MAX_BOOKMARKS_PER_USER = 1000;
export const MAX_FOLDERS_PER_USER = 50;
export const MAX_FOLDER_NAME_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
// Error Messages
export const BOOKMARK_ERROR_MESSAGES = {
  NOT_FOUND: 'Không tìm thấy bookmark',
  DOCUMENT_NOT_FOUND: 'Không tìm thấy tài liệu hoặc không thể truy cập',
  FOLDER_NOT_FOUND: 'Không tìm thấy thư mục đánh dấu',
  ALREADY_BOOKMARKED: 'Tài liệu đã được đánh dấu',
  MAX_BOOKMARKS_REACHED: 'Đã đạt số lượng bookmark tối đa',
  MAX_FOLDERS_REACHED: 'Đã đạt số lượng thư mục tối đa',
  PRIVATE_DOCUMENT_API_KEY:
    'Tài liệu riêng tư không thể đánh dấu khi chia sẻ qua API key',
} as const;

// Success Messages

export const BOOKMARK_SUCCESS_MESSAGES = {
  CREATED: 'Đã thêm vào danh sách đánh dấu',
  DELETED: 'Đã xóa khỏi danh sách đánh dấu',
  UPDATED: 'Đã cập nhật bookmark',
  FOLDER_CREATED: 'Đã tạo thư mục mới',
  FOLDER_DELETED: 'Đã xóa thư mục',
  FOLDER_UPDATED: 'Đã cập nhật thư mục',
  MOVED: 'Đã di chuyển bookmark',
} as const;
