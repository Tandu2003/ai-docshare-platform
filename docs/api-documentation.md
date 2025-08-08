# API Documentation - Hệ thống chia sẻ tài liệu học tập thông minh

## Base URL

```
https://api.document-sharing.com/v1
```

## Authentication

Tất cả API endpoints (trừ đăng ký/đăng nhập) yêu cầu Bearer Token:

```
Authorization: Bearer <access_token>
```

## Response Format

Tất cả responses đều theo format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Pagination

Các endpoints hỗ trợ pagination sử dụng query parameters:

- `page` - Số trang (default: 1)
- `limit` - Số item per page (default: 10, max: 100)
- `sort` - Sắp xếp theo field (default: createdAt)
- `order` - Thứ tự sắp xếp: `asc` hoặc `desc` (default: desc)

Response pagination format:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## File Upload

Các endpoints upload file sử dụng `multipart/form-data`:

- **Storage**: Cloudflare R2
- File size limit: 100MB
- Supported formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG, GIF
- Auto-generated thumbnail cho PDF files
- Virus scan: Quét virus trước khi lưu trữ

## Rate Limiting

- 100 requests per minute cho authenticated users
- 10 requests per minute cho unauthenticated users
- 1000 requests per hour cho file uploads
