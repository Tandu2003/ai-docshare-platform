# Document Management API

## 1. Tìm kiếm và Khám phá

### GET /api/documents/search

Tìm kiếm tài liệu theo từ khóa và bộ lọc

**Query Parameters:**

```json
{
  "q": "string", // Từ khóa tìm kiếm
  "categoryId": "string", // ID danh mục
  "tags": "string[]", // Mảng thẻ
  "uploaderId": "string", // ID người upload
  "mimeType": "string", // Loại file
  "isPublic": "boolean", // Tài liệu công khai
  "isPremium": "boolean", // Tài liệu premium
  "minRating": "number", // Đánh giá tối thiểu (1-5)
  "dateFrom": "string", // Từ ngày (ISO 8601)
  "dateTo": "string", // Đến ngày (ISO 8601)
  "sort": "string", // Sắp xếp: relevance, rating, downloads, views, date
  "order": "string", // asc/desc
  "page": "number", // Số trang
  "limit": "number" // Số item per page
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "fileName": "string",
        "fileSize": "number",
        "mimeType": "string",
        "thumbnailPath": "string",
        "uploader": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
        "category": {
          "id": "string",
          "name": "string"
        },
        "downloadCount": "number",
        "viewCount": "number",
        "averageRating": "number",
        "totalRatings": "number",
        "tags": "string[]",
        "isPublic": "boolean",
        "isPremium": "boolean",
        "createdAt": "string",
        "updatedAt": "string"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "categories": [],
      "tags": [],
      "uploaders": []
    }
  }
}
```

### GET /api/documents/suggestions

Gợi ý tìm kiếm thông minh (AI)

**Query Parameters:**

```json
{
  "q": "string", // Từ khóa hiện tại
  "limit": "number" // Số gợi ý (default: 5)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "string", // "keyword", "document", "category"
        "value": "string", // Giá trị gợi ý
        "score": "number", // Độ tin cậy (0-1)
        "metadata": {} // Thông tin bổ sung
      }
    ]
  }
}
```

### GET /api/documents/recommendations

Đề xuất tài liệu cá nhân hóa (AI)

**Query Parameters:**

```json
{
  "algorithm": "string", // "collaborative", "content", "hybrid"
  "limit": "number", // Số đề xuất (default: 10)
  "categoryId": "string" // Lọc theo danh mục
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "document": {
          "id": "string",
          "title": "string",
          "description": "string",
          "thumbnailPath": "string",
          "uploader": {},
          "category": {},
          "averageRating": "number",
          "downloadCount": "number"
        },
        "score": "number",
        "reason": "string",
        "algorithm": "string"
      }
    ]
  }
}
```

### GET /api/documents/popular

Tài liệu phổ biến

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "categoryId": "string", // Lọc theo danh mục
  "limit": "number" // Số tài liệu (default: 10)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "thumbnailPath": "string",
        "uploader": {},
        "category": {},
        "downloadCount": "number",
        "viewCount": "number",
        "averageRating": "number",
        "popularityScore": "number"
      }
    ]
  }
}
```

### GET /api/documents/recent

Tài liệu mới nhất

**Query Parameters:**

```json
{
  "categoryId": "string", // Lọc theo danh mục
  "limit": "number" // Số tài liệu (default: 10)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "thumbnailPath": "string",
        "uploader": {},
        "category": {},
        "createdAt": "string",
        "downloadCount": "number",
        "viewCount": "number"
      }
    ]
  }
}
```

### GET /api/documents/trending

Tài liệu xu hướng

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month"
  "categoryId": "string", // Lọc theo danh mục
  "limit": "number" // Số tài liệu (default: 10)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "thumbnailPath": "string",
        "uploader": {},
        "category": {},
        "trendingScore": "number",
        "growthRate": "number",
        "downloadCount": "number",
        "viewCount": "number"
      }
    ]
  }
}
```

## 2. Xem và Tải tài liệu

### GET /api/documents/:id

Xem chi tiết tài liệu

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "fileName": "string",
    "fileSize": "number",
    "mimeType": "string",
    "filePath": "string",
    "thumbnailPath": "string",
    "uploader": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "category": {
      "id": "string",
      "name": "string",
      "description": "string"
    },
    "downloadCount": "number",
    "viewCount": "number",
    "averageRating": "number",
    "totalRatings": "number",
    "isPublic": "boolean",
    "isPremium": "boolean",
    "isApproved": "boolean",
    "tags": "string[]",
    "language": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "aiAnalysis": {
      "summary": "string",
      "keyPoints": "string[]",
      "difficulty": "string",
      "readingTime": "number",
      "confidence": "number"
    },
    "userRating": {
      "rating": "number",
      "createdAt": "string"
    },
    "isBookmarked": "boolean",
    "canDownload": "boolean",
    "canEdit": "boolean"
  }
}
```

### GET /api/documents/:id/download

Tải xuống tài liệu

**Response:**

```
File download stream
```

**Headers:**

```
Content-Disposition: attachment; filename="document.pdf"
Content-Type: application/pdf
```

### GET /api/documents/:id/preview

Xem trước tài liệu

**Query Parameters:**

```json
{
  "page": "number", // Số trang (cho PDF)
  "width": "number", // Chiều rộng (default: 800)
  "height": "number" // Chiều cao (default: 600)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "previewUrl": "string",
    "totalPages": "number",
    "dimensions": {
      "width": "number",
      "height": "number"
    }
  }
}
```

### GET /api/documents/:id/ai-summary

Tóm tắt tài liệu bằng AI

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": "string",
    "keyPoints": "string[]",
    "difficulty": "string",
    "readingTime": "number",
    "confidence": "number",
    "sentimentScore": "number",
    "topicModeling": {},
    "namedEntities": {},
    "processedAt": "string"
  }
}
```

### POST /api/documents/:id/view

Ghi nhận lượt xem

**Response:**

```json
{
  "success": true,
  "data": {
    "viewCount": "number",
    "message": "View recorded successfully"
  }
}
```

## 3. Upload và Quản lý tài liệu

### POST /api/documents/upload

Tải lên tài liệu mới

**Body (multipart/form-data):**

```json
{
  "file": "File", // File tài liệu
  "title": "string", // Tiêu đề tài liệu
  "description": "string", // Mô tả
  "categoryId": "string", // ID danh mục
  "tags": "string[]", // Mảng thẻ
  "isPublic": "boolean", // Công khai (default: true)
  "isPremium": "boolean", // Premium (default: false)
  "language": "string" // Ngôn ngữ (default: "en")
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "fileName": "string",
    "fileSize": "number",
    "mimeType": "string",
    "filePath": "string",
    "thumbnailPath": "string",
    "category": {},
    "tags": "string[]",
    "isPublic": "boolean",
    "isPremium": "boolean",
    "isApproved": "boolean",
    "createdAt": "string",
    "uploadProgress": {
      "status": "string", // "processing", "completed", "failed"
      "message": "string"
    }
  }
}
```

### PUT /api/documents/:id

Cập nhật thông tin tài liệu

**Body:**

```json
{
  "title": "string",
  "description": "string",
  "categoryId": "string",
  "tags": "string[]",
  "isPublic": "boolean",
  "isPremium": "boolean",
  "language": "string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "title": "string",
    "description": "string",
    "category": {},
    "tags": "string[]",
    "isPublic": "boolean",
    "isPremium": "boolean",
    "updatedAt": "string"
  }
}
```

### DELETE /api/documents/:id

Xóa tài liệu

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Document deleted successfully"
  }
}
```

### GET /api/documents/my-documents

Tài liệu đã chia sẻ của tôi

**Query Parameters:**

```json
{
  "status": "string", // "all", "approved", "pending", "rejected"
  "sort": "string", // "createdAt", "title", "downloads", "views"
  "order": "string", // "asc", "desc"
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "thumbnailPath": "string",
        "category": {},
        "downloadCount": "number",
        "viewCount": "number",
        "averageRating": "number",
        "isPublic": "boolean",
        "isApproved": "boolean",
        "createdAt": "string",
        "updatedAt": "string"
      }
    ],
    "pagination": {}
  }
}
```

### POST /api/documents/:id/duplicate-check

Kiểm tra trùng lặp tài liệu

**Body:**

```json
{
  "fileHash": "string"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isDuplicate": "boolean",
    "similarDocuments": [
      {
        "id": "string",
        "title": "string",
        "similarityScore": "number",
        "uploader": {}
      }
    ]
  }
}
```
