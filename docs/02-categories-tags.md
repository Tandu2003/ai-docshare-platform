# Categories & Tags API

## Categories Management

### GET /api/categories

Lấy danh sách danh mục

**Query Parameters:**

```json
{
  "parentId": "string", // ID danh mục cha (null cho danh mục gốc)
  "isActive": "boolean", // Lọc theo trạng thái
  "sort": "string", // "name", "sortOrder", "documentCount"
  "order": "string", // "asc", "desc"
  "includeChildren": "boolean", // Bao gồm danh mục con
  "includeStats": "boolean" // Bao gồm thống kê
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "icon": "string",
        "color": "string",
        "parentId": "string",
        "isActive": "boolean",
        "documentCount": "number",
        "sortOrder": "number",
        "createdAt": "string",
        "updatedAt": "string",
        "children": [
          {
            "id": "string",
            "name": "string",
            "description": "string",
            "documentCount": "number"
          }
        ],
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

### GET /api/categories/:id

Lấy chi tiết danh mục

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "icon": "string",
    "color": "string",
    "parentId": "string",
    "isActive": "boolean",
    "documentCount": "number",
    "sortOrder": "number",
    "createdAt": "string",
    "updatedAt": "string",
    "parent": {
      "id": "string",
      "name": "string"
    },
    "children": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "documentCount": "number"
      }
    ],
    "stats": {
      "totalDocuments": "number",
      "totalDownloads": "number",
      "totalViews": "number",
      "averageRating": "number",
      "recentUploads": "number"
    }
  }
}
```

### GET /api/categories/:id/documents

Tài liệu theo danh mục

**Query Parameters:**

```json
{
  "includeSubcategories": "boolean", // Bao gồm tài liệu từ danh mục con
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
    "category": {
      "id": "string",
      "name": "string",
      "description": "string"
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
      "subcategories": [],
      "tags": [],
      "uploaders": []
    }
  }
}
```

### POST /api/categories

Tạo danh mục mới (Admin only)

**Body:**

```json
{
  "name": "string",
  "description": "string",
  "icon": "string",
  "color": "string",
  "parentId": "string",
  "sortOrder": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "icon": "string",
    "color": "string",
    "parentId": "string",
    "isActive": "boolean",
    "documentCount": "number",
    "sortOrder": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PUT /api/categories/:id

Cập nhật danh mục (Admin only)

**Body:**

```json
{
  "name": "string",
  "description": "string",
  "icon": "string",
  "color": "string",
  "parentId": "string",
  "isActive": "boolean",
  "sortOrder": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "icon": "string",
    "color": "string",
    "parentId": "string",
    "isActive": "boolean",
    "documentCount": "number",
    "sortOrder": "number",
    "updatedAt": "string"
  }
}
```

### DELETE /api/categories/:id

Xóa danh mục (Admin only)

**Query Parameters:**

```json
{
  "force": "boolean", // Xóa cứng (default: false)
  "moveToCategory": "string" // ID danh mục chuyển tài liệu đến
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Category deleted successfully",
    "movedDocuments": "number"
  }
}
```

### GET /api/categories/hierarchy

Lấy cấu trúc phân cấp danh mục

**Response:**

```json
{
  "success": true,
  "data": {
    "hierarchy": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "icon": "string",
        "color": "string",
        "documentCount": "number",
        "level": "number",
        "children": [
          {
            "id": "string",
            "name": "string",
            "description": "string",
            "documentCount": "number",
            "level": "number",
            "children": []
          }
        ]
      }
    ]
  }
}
```

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
