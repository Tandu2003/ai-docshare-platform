# Bookmarks & Organization API

## Bookmark Management

### POST /api/documents/:id/bookmark

Thêm vào bookmark

**Body:**

```json
{
  "folderId": "string", // ID thư mục (optional)
  "notes": "string" // Ghi chú (optional)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "documentId": "string",
    "folderId": "string",
    "notes": "string",
    "createdAt": "string",
    "document": {
      "id": "string",
      "title": "string",
      "description": "string",
      "thumbnailPath": "string",
      "uploader": {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string"
      },
      "category": {
        "id": "string",
        "name": "string"
      }
    }
  }
}
```

### DELETE /api/documents/:id/bookmark

Xóa khỏi bookmark

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Bookmark removed successfully"
  }
}
```

### GET /api/bookmarks

Danh sách bookmark

**Query Parameters:**

```json
{
  "folderId": "string", // Lọc theo thư mục
  "sort": "string", // "createdAt", "documentTitle", "documentRating"
  "order": "string", // "asc", "desc"
  "search": "string", // Tìm kiếm theo tên tài liệu
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bookmarks": [
      {
        "id": "string",
        "documentId": "string",
        "folderId": "string",
        "notes": "string",
        "createdAt": "string",
        "document": {
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
        },
        "folder": {
          "id": "string",
          "name": "string",
          "description": "string"
        }
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

### PUT /api/bookmarks/:id

Cập nhật ghi chú bookmark

**Body:**

```json
{
  "notes": "string" // Ghi chú mới
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "notes": "string",
    "updatedAt": "string"
  }
}
```

### POST /api/bookmarks/move

Di chuyển bookmark sang thư mục khác

**Body:**

```json
{
  "bookmarkIds": "string[]", // Mảng ID bookmark
  "folderId": "string" // ID thư mục đích
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Bookmarks moved successfully",
    "movedCount": "number"
  }
}
```

### DELETE /api/bookmarks/batch

Xóa nhiều bookmark

**Body:**

```json
{
  "bookmarkIds": "string[]" // Mảng ID bookmark cần xóa
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Bookmarks deleted successfully",
    "deletedCount": "number"
  }
}
```

### GET /api/bookmarks/search

Tìm kiếm trong bookmark

**Query Parameters:**

```json
{
  "q": "string", // Từ khóa tìm kiếm
  "folderId": "string", // Lọc theo thư mục
  "sort": "string", // "relevance", "createdAt", "documentTitle"
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
    "results": [
      {
        "id": "string",
        "documentId": "string",
        "folderId": "string",
        "notes": "string",
        "createdAt": "string",
        "relevanceScore": "number",
        "document": {
          "id": "string",
          "title": "string",
          "description": "string",
          "thumbnailPath": "string",
          "uploader": {
            "id": "string",
            "username": "string",
            "firstName": "string",
            "lastName": "string"
          },
          "category": {
            "id": "string",
            "name": "string"
          }
        },
        "folder": {
          "id": "string",
          "name": "string"
        }
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

## Bookmark Folders Management

### GET /api/bookmark-folders

Danh sách thư mục bookmark

**Query Parameters:**

```json
{
  "includeStats": "boolean", // Bao gồm thống kê
  "sort": "string", // "name", "sortOrder", "bookmarkCount"
  "order": "string" // "asc", "desc"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "isDefault": "boolean",
        "sortOrder": "number",
        "bookmarkCount": "number",
        "createdAt": "string",
        "updatedAt": "string",
        "stats": {
          "totalBookmarks": "number",
          "recentBookmarks": "number",
          "averageDocumentRating": "number"
        }
      }
    ]
  }
}
```

### POST /api/bookmark-folders

Tạo thư mục bookmark mới

**Body:**

```json
{
  "name": "string",
  "description": "string",
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
    "isDefault": "boolean",
    "sortOrder": "number",
    "bookmarkCount": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PUT /api/bookmark-folders/:id

Cập nhật thư mục bookmark

**Body:**

```json
{
  "name": "string",
  "description": "string",
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
    "isDefault": "boolean",
    "sortOrder": "number",
    "bookmarkCount": "number",
    "updatedAt": "string"
  }
}
```

### DELETE /api/bookmark-folders/:id

Xóa thư mục bookmark

**Query Parameters:**

```json
{
  "moveToFolder": "string" // ID thư mục chuyển bookmark đến
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Folder deleted successfully",
    "movedBookmarks": "number"
  }
}
```

### GET /api/bookmark-folders/:id/bookmarks

Bookmark trong thư mục

**Query Parameters:**

```json
{
  "sort": "string", // "createdAt", "documentTitle", "documentRating"
  "order": "string", // "asc", "desc"
  "search": "string", // Tìm kiếm theo tên tài liệu
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "folder": {
      "id": "string",
      "name": "string",
      "description": "string",
      "isDefault": "boolean",
      "bookmarkCount": "number"
    },
    "bookmarks": [
      {
        "id": "string",
        "documentId": "string",
        "notes": "string",
        "createdAt": "string",
        "document": {
          "id": "string",
          "title": "string",
          "description": "string",
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

### POST /api/bookmark-folders/reorder

Sắp xếp lại thứ tự thư mục

**Body:**

```json
{
  "folderOrders": [
    {
      "id": "string",
      "sortOrder": "number"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Folders reordered successfully"
  }
}
```

## Organization Features

### GET /api/organization/stats

Thống kê tổ chức

**Response:**

```json
{
  "success": true,
  "data": {
    "totalBookmarks": "number",
    "totalFolders": "number",
    "recentBookmarks": "number",
    "mostUsedFolders": [
      {
        "id": "string",
        "name": "string",
        "bookmarkCount": "number"
      }
    ],
    "bookmarksByCategory": [
      {
        "categoryId": "string",
        "categoryName": "string",
        "bookmarkCount": "number"
      }
    ],
    "recentActivity": [
      {
        "type": "string", // "added", "moved", "deleted"
        "documentTitle": "string",
        "folderName": "string",
        "timestamp": "string"
      }
    ]
  }
}
```

### POST /api/organization/export

Xuất bookmark

**Body:**

```json
{
  "format": "string", // "json", "csv", "html"
  "folderId": "string", // ID thư mục (optional)
  "includeNotes": "boolean" // Bao gồm ghi chú
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "string",
    "expiresAt": "string",
    "fileSize": "number"
  }
}
```

### POST /api/organization/import

Nhập bookmark

**Body (multipart/form-data):**

```json
{
  "file": "File", // File import
  "format": "string", // "json", "csv", "html"
  "folderId": "string", // ID thư mục đích
  "duplicateAction": "string" // "skip", "overwrite", "rename"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "importedCount": "number",
    "skippedCount": "number",
    "errors": [
      {
        "row": "number",
        "error": "string"
      }
    ]
  }
}
```

### GET /api/organization/suggestions

Gợi ý tổ chức (AI)

**Query Parameters:**

```json
{
  "documentId": "string", // ID tài liệu
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
        "type": "string", // "folder", "tag", "note"
        "value": "string",
        "confidence": "number",
        "reason": "string"
      }
    ]
  }
}
```

### POST /api/organization/auto-organize

Tự động tổ chức bookmark (AI)

**Body:**

```json
{
  "action": "string", // "categorize", "suggest_folders", "cleanup"
  "options": {
    "createFolders": "boolean",
    "moveExisting": "boolean",
    "confidenceThreshold": "number"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processedCount": "number",
    "createdFolders": "number",
    "movedBookmarks": "number",
    "suggestions": [
      {
        "bookmarkId": "string",
        "suggestedFolder": "string",
        "confidence": "number"
      }
    ]
  }
}
```
