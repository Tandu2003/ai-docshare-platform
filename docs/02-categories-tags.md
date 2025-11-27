# Categories & Tags API

## Categories Management

### GET /api/categories

Lấy danh sách danh mục

**Query Parameters:**

| Parameter         | Type    | Description                                      |
| ----------------- | ------- | ------------------------------------------------ |
| `includeInactive` | boolean | Bao gồm danh mục không hoạt động (default: true) |

**Response:**

```json
{
  "success": true,
  "message": "Danh mục đã được truy xuất thành công",
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "color": "string",
      "parentId": "string | null",
      "isActive": true,
      "documentCount": 10,
      "totalDownloads": 150,
      "totalViews": 500,
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "parent": {
        "id": "string",
        "name": "string",
        "icon": "string",
        "color": "string"
      }
    }
  ]
}
```

### GET /api/categories/public

Lấy danh sách danh mục công khai (chỉ danh mục đang hoạt động)

**Response:** Giống như `GET /api/categories` nhưng chỉ bao gồm danh mục có `isActive: true`

### GET /api/categories/:id

Lấy chi tiết danh mục kèm danh sách tài liệu phân trang

**Query Parameters:**

| Parameter | Type   | Description                                                                |
| --------- | ------ | -------------------------------------------------------------------------- |
| `page`    | number | Số trang (default: 1)                                                      |
| `limit`   | number | Số tài liệu mỗi trang (default: 12, max: 100)                              |
| `sort`    | string | Trường sắp xếp: `createdAt`, `downloadCount`, `viewCount`, `averageRating` |
| `order`   | string | Thứ tự: `asc` hoặc `desc` (default: desc)                                  |

**Response:**

```json
{
  "success": true,
  "message": "Chi tiết danh mục và danh sách tài liệu",
  "data": {
    "category": {
      "id": "string",
      "name": "string",
      "description": "string",
      "icon": "string",
      "color": "string",
      "parentId": "string | null",
      "isActive": true,
      "documentCount": 25,
      "totalDownloads": 500,
      "totalViews": 2000,
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "parent": {
        "id": "string",
        "name": "string",
        "icon": "string",
        "color": "string"
      },
      "children": [
        {
          "id": "string",
          "name": "string",
          "icon": "string",
          "color": "string",
          "isActive": true
        }
      ]
    },
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 25,
      "pages": 3
    },
    "documents": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "downloadCount": 50,
        "viewCount": 200,
        "averageRating": 4.5,
        "totalRatings": 10,
        "tags": ["tag1", "tag2"],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "uploader": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
        "thumbnail": "string | null",
        "mimeType": "application/pdf"
      }
    ]
  }
}
```

### POST /api/categories/suggest-for-document/:documentId

Gợi ý danh mục phù hợp cho tài liệu sử dụng AI

**Authentication:** Required (JWT)

**Permission:** Chỉ chủ sở hữu tài liệu hoặc admin

**Response:**

```json
{
  "success": true,
  "message": "Gợi ý danh mục cho tài liệu",
  "data": {
    "documentId": "string",
    "currentCategoryId": "string",
    "suggestions": [
      {
        "id": "string",
        "name": "string",
        "icon": "string",
        "color": "string",
        "parentId": "string | null",
        "score": 5,
        "confidence": 80
      }
    ],
    "basis": {
      "documentTags": ["tag1", "tag2"],
      "aiSuggestedTags": ["ai-tag1", "ai-tag2"]
    }
  }
}
```

**Algorithm:** Gợi ý dựa trên:

- Các thẻ của tài liệu
- Kết quả phân tích AI (suggestedTags, keyPoints, summary)
- So khớp từ khóa với tên và mô tả danh mục
- Điểm số dựa trên độ trùng khớp từ khóa

### POST /api/categories

Tạo danh mục mới (Admin only)

**Authentication:** Required (JWT + Admin role)

**Body:**

```json
{
  "name": "string (required)",
  "description": "string",
  "icon": "string (emoji)",
  "color": "string (hex)",
  "parentId": "string | null",
  "isActive": true,
  "sortOrder": 0
}
```

**Response:**

```json
{
  "success": true,
  "message": "Danh mục đã được tạo thành công",
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "icon": "string",
    "color": "string",
    "parentId": "string | null",
    "isActive": true,
    "documentCount": 0,
    "totalDownloads": 0,
    "totalViews": 0,
    "sortOrder": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "parent": null
  }
}
```

### PATCH /api/categories/:id

Cập nhật danh mục (Admin only)

**Authentication:** Required (JWT + Admin role)

**Body:** (tất cả các trường đều optional)

```json
{
  "name": "string",
  "description": "string",
  "icon": "string",
  "color": "string",
  "parentId": "string | null",
  "isActive": true,
  "sortOrder": 0
}
```

### DELETE /api/categories/:id

Xóa danh mục (Admin only)

**Authentication:** Required (JWT + Admin role)

**Validation:**

- Không thể xóa danh mục có danh mục con
- Không thể xóa danh mục có tài liệu liên kết

**Response:**

```json
{
  "success": true,
  "message": "Danh mục đã được xóa thành công",
  "data": null
}
```

---

## Tags Management

### GET /api/tags

Lấy danh sách thẻ

**Query Parameters:**

```json
{
  "search": "string", // Tìm kiếm theo tên thẻ
  "sort": "string", // "name", "usageCount", "recentUsage"
  "order": "string", // "asc", "desc"
  "limit": "number", // Số thẻ (default: 50)
  "includeStats": "boolean" // Bao gồm thống kê
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "name": "string",
        "usageCount": "number",
        "recentUsage": "string",
        "stats": {
          "totalDocuments": "number",
          "totalDownloads": "number",
          "averageRating": "number"
        }
      }
    ]
  }
}
```

### GET /api/tags/popular

Thẻ phổ biến

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "categoryId": "string", // Lọc theo danh mục
  "limit": "number" // Số thẻ (default: 20)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "name": "string",
        "usageCount": "number",
        "trendingScore": "number",
        "growthRate": "number",
        "relatedTags": "string[]"
      }
    ]
  }
}
```

### GET /api/tags/suggestions

Gợi ý thẻ tự động (AI)

**Query Parameters:**

```json
{
  "documentTitle": "string", // Tiêu đề tài liệu
  "documentDescription": "string", // Mô tả tài liệu
  "categoryId": "string", // ID danh mục
  "existingTags": "string[]", // Thẻ đã có
  "limit": "number" // Số gợi ý (default: 10)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tag": "string",
        "confidence": "number",
        "reason": "string",
        "relatedTags": "string[]"
      }
    ]
  }
}
```

### GET /api/tags/:name/documents

Tài liệu theo thẻ

**Query Parameters:**

```json
{
  "sort": "string", // "createdAt", "title", "downloads", "views", "rating"
  "order": "string", // "asc", "desc"
  "isPublic": "boolean", // Lọc tài liệu công khai
  "isPremium": "boolean", // Lọc tài liệu premium
  "minRating": "number", // Đánh giá tối thiểu
  "dateFrom": "string", // Từ ngày
  "dateTo": "string", // Đến ngày
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tag": {
      "name": "string",
      "usageCount": "number"
    },
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
    }
  }
}
```

### GET /api/tags/related

Thẻ liên quan

**Query Parameters:**

```json
{
  "tags": "string[]", // Mảng thẻ
  "limit": "number" // Số thẻ liên quan (default: 10)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "relatedTags": [
      {
        "tag": "string",
        "correlation": "number",
        "coOccurrence": "number"
      }
    ]
  }
}
```

### POST /api/tags/merge

Gộp thẻ (Admin only)

**Body:**

```json
{
  "sourceTags": "string[]", // Thẻ nguồn
  "targetTag": "string" // Thẻ đích
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Tags merged successfully",
    "mergedCount": "number",
    "targetTag": "string"
  }
}
```

### DELETE /api/tags/:name

Xóa thẻ (Admin only)

**Query Parameters:**

```json
{
  "force": "boolean" // Xóa cứng (default: false)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Tag deleted successfully",
    "affectedDocuments": "number"
  }
}
```
