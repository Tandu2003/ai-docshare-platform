# Analytics & Statistics API

## User Analytics

### GET /api/analytics/my-stats

Thống kê cá nhân

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "startDate": "string", // Ngày bắt đầu (ISO 8601)
  "endDate": "string" // Ngày kết thúc (ISO 8601)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalDocuments": "number",
      "totalDownloads": "number",
      "totalViews": "number",
      "totalRatings": "number",
      "averageRating": "number",
      "totalBookmarks": "number",
      "totalComments": "number"
    },
    "periodStats": {
      "documentsUploaded": "number",
      "downloadsReceived": "number",
      "viewsReceived": "number",
      "ratingsReceived": "number",
      "bookmarksReceived": "number",
      "commentsReceived": "number"
    },
    "trends": {
      "daily": [
        {
          "date": "string",
          "documents": "number",
          "downloads": "number",
          "views": "number",
          "ratings": "number"
        }
      ],
      "weekly": [],
      "monthly": []
    },
    "topDocuments": [
      {
        "id": "string",
        "title": "string",
        "downloadCount": "number",
        "viewCount": "number",
        "averageRating": "number"
      }
    ],
    "categoryBreakdown": [
      {
        "categoryId": "string",
        "categoryName": "string",
        "documentCount": "number",
        "downloadCount": "number",
        "viewCount": "number"
      }
    ]
  }
}
```

### GET /api/analytics/my-documents-stats

Thống kê tài liệu đã chia sẻ

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "categoryId": "string", // Lọc theo danh mục
  "sort": "string", // "downloads", "views", "rating", "createdAt"
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
    "summary": {
      "totalDocuments": "number",
      "totalDownloads": "number",
      "totalViews": "number",
      "averageRating": "number",
      "totalRatings": "number"
    },
    "documents": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "thumbnailPath": "string",
        "category": {
          "id": "string",
          "name": "string"
        },
        "downloadCount": "number",
        "viewCount": "number",
        "averageRating": "number",
        "totalRatings": "number",
        "bookmarkCount": "number",
        "commentCount": "number",
        "createdAt": "string",
        "updatedAt": "string",
        "performance": {
          "downloadTrend": "number",
          "viewTrend": "number",
          "ratingTrend": "number"
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

### GET /api/analytics/search-history

Lịch sử tìm kiếm

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "query": "string", // Lọc theo từ khóa
  "sort": "string", // "searchedAt", "resultsCount"
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
    "summary": {
      "totalSearches": "number",
      "uniqueQueries": "number",
      "averageResults": "number",
      "mostSearchedTerms": [
        {
          "query": "string",
          "count": "number"
        }
      ]
    },
    "searches": [
      {
        "id": "string",
        "query": "string",
        "filters": {},
        "resultsCount": "number",
        "clickedDocumentId": "string",
        "clickedDocument": {
          "id": "string",
          "title": "string",
          "thumbnailPath": "string"
        },
        "searchedAt": "string",
        "sessionId": "string"
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

### GET /api/analytics/activity-timeline

Timeline hoạt động

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "action": "string", // Lọc theo hành động
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "string",
        "action": "string",
        "resourceType": "string",
        "resourceId": "string",
        "metadata": {},
        "createdAt": "string",
        "document": {
          "id": "string",
          "title": "string",
          "thumbnailPath": "string"
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

## Admin Analytics

### GET /api/admin/analytics/dashboard

Dashboard thống kê tổng quan (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "startDate": "string", // Ngày bắt đầu
  "endDate": "string" // Ngày kết thúc
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": "number",
      "totalDocuments": "number",
      "totalDownloads": "number",
      "totalViews": "number",
      "totalRatings": "number",
      "totalComments": "number",
      "totalBookmarks": "number"
    },
    "growth": {
      "newUsers": "number",
      "newDocuments": "number",
      "newDownloads": "number",
      "newViews": "number",
      "growthRate": "number"
    },
    "periodComparison": {
      "currentPeriod": {
        "users": "number",
        "documents": "number",
        "downloads": "number",
        "views": "number"
      },
      "previousPeriod": {
        "users": "number",
        "documents": "number",
        "downloads": "number",
        "views": "number"
      },
      "change": {
        "users": "number",
        "documents": "number",
        "downloads": "number",
        "views": "number"
      }
    },
    "trends": {
      "daily": [
        {
          "date": "string",
          "users": "number",
          "documents": "number",
          "downloads": "number",
          "views": "number"
        }
      ],
      "weekly": [],
      "monthly": []
    },
    "topPerformers": {
      "topDocuments": [
        {
          "id": "string",
          "title": "string",
          "uploader": {
            "id": "string",
            "username": "string",
            "firstName": "string",
            "lastName": "string"
          },
          "downloadCount": "number",
          "viewCount": "number",
          "averageRating": "number"
        }
      ],
      "topUploaders": [
        {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "documentCount": "number",
          "totalDownloads": "number",
          "totalViews": "number"
        }
      ],
      "topCategories": [
        {
          "id": "string",
          "name": "string",
          "documentCount": "number",
          "downloadCount": "number",
          "viewCount": "number"
        }
      ]
    }
  }
}
```

### GET /api/admin/analytics/documents

Thống kê tài liệu (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "categoryId": "string", // Lọc theo danh mục
  "uploaderId": "string", // Lọc theo người upload
  "status": "string", // "approved", "pending", "rejected"
  "sort": "string", // "downloads", "views", "rating", "createdAt"
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
    "summary": {
      "totalDocuments": "number",
      "approvedDocuments": "number",
      "pendingDocuments": "number",
      "rejectedDocuments": "number",
      "totalDownloads": "number",
      "totalViews": "number",
      "averageRating": "number"
    },
    "documents": [
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
        "isPublic": "boolean",
        "isApproved": "boolean",
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

### GET /api/admin/analytics/users

Thống kê người dùng (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "role": "string", // Lọc theo vai trò
  "status": "string", // "active", "inactive", "verified"
  "sort": "string", // "createdAt", "documentCount", "downloadCount"
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
    "summary": {
      "totalUsers": "number",
      "activeUsers": "number",
      "verifiedUsers": "number",
      "newUsers": "number",
      "totalDocuments": "number",
      "totalDownloads": "number"
    },
    "users": [
      {
        "id": "string",
        "username": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "avatar": "string",
        "role": {
          "id": "string",
          "name": "string"
        },
        "isVerified": "boolean",
        "isActive": "boolean",
        "lastLoginAt": "string",
        "createdAt": "string",
        "stats": {
          "documentCount": "number",
          "downloadCount": "number",
          "viewCount": "number",
          "ratingCount": "number",
          "commentCount": "number",
          "bookmarkCount": "number"
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

### GET /api/admin/analytics/downloads

Thống kê lượt tải (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "documentId": "string", // Lọc theo tài liệu
  "userId": "string", // Lọc theo người dùng
  "categoryId": "string", // Lọc theo danh mục
  "sort": "string", // "downloadedAt", "documentTitle"
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
    "summary": {
      "totalDownloads": "number",
      "uniqueUsers": "number",
      "uniqueDocuments": "number",
      "averageDownloadsPerDocument": "number"
    },
    "downloads": [
      {
        "id": "string",
        "documentId": "string",
        "userId": "string",
        "ipAddress": "string",
        "userAgent": "string",
        "referrer": "string",
        "downloadedAt": "string",
        "document": {
          "id": "string",
          "title": "string",
          "fileName": "string",
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
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string"
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

### GET /api/admin/analytics/ratings

Thống kê đánh giá (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "rating": "number", // Lọc theo số sao (1-5)
  "documentId": "string", // Lọc theo tài liệu
  "userId": "string", // Lọc theo người dùng
  "sort": "string", // "createdAt", "rating"
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
    "summary": {
      "totalRatings": "number",
      "averageRating": "number",
      "ratingDistribution": {
        "1": "number",
        "2": "number",
        "3": "number",
        "4": "number",
        "5": "number"
      },
      "uniqueUsers": "number",
      "uniqueDocuments": "number"
    },
    "ratings": [
      {
        "id": "string",
        "rating": "number",
        "documentId": "string",
        "userId": "string",
        "createdAt": "string",
        "updatedAt": "string",
        "document": {
          "id": "string",
          "title": "string",
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
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string"
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

### GET /api/admin/analytics/reports

Thống kê báo cáo (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "type": "string", // Lọc theo loại báo cáo
  "status": "string", // "PENDING", "INVESTIGATING", "RESOLVED", "DISMISSED"
  "sort": "string", // "createdAt", "type"
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
    "summary": {
      "totalReports": "number",
      "pendingReports": "number",
      "resolvedReports": "number",
      "dismissedReports": "number",
      "reportTypes": {
        "SPAM": "number",
        "INAPPROPRIATE_CONTENT": "number",
        "COPYRIGHT_VIOLATION": "number",
        "HARASSMENT": "number",
        "FAKE_DOCUMENT": "number",
        "OTHER": "number"
      }
    },
    "reports": [
      {
        "id": "string",
        "type": "string",
        "reason": "string",
        "description": "string",
        "status": "string",
        "createdAt": "string",
        "resolvedAt": "string",
        "reporter": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string"
        },
        "reportedUser": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string"
        },
        "document": {
          "id": "string",
          "title": "string",
          "uploader": {
            "id": "string",
            "username": "string",
            "firstName": "string",
            "lastName": "string"
          }
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

### POST /api/admin/analytics/export

Xuất báo cáo thống kê (Admin only)

**Body:**

```json
{
  "type": "string", // "users", "documents", "downloads", "ratings", "reports"
  "format": "string", // "csv", "excel", "pdf"
  "period": "string", // "day", "week", "month", "year"
  "startDate": "string", // Ngày bắt đầu
  "endDate": "string", // Ngày kết thúc
  "filters": {} // Các bộ lọc bổ sung
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "string",
    "expiresAt": "string",
    "fileSize": "number",
    "recordCount": "number"
  }
}
```
