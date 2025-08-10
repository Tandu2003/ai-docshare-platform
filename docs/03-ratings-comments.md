# Ratings & Comments API

## Ratings Management

### POST /api/documents/:id/ratings

Đánh giá tài liệu

**Body:**

```json
{
  "rating": "number" // Đánh giá từ 1-5 sao
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "rating": "number",
    "documentId": "string",
    "userId": "string",
    "createdAt": "string",
    "document": {
      "id": "string",
      "title": "string",
      "averageRating": "number",
      "totalRatings": "number"
    }
  }
}
```

### PUT /api/documents/:id/ratings

Cập nhật đánh giá

**Body:**

```json
{
  "rating": "number" // Đánh giá mới từ 1-5 sao
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "rating": "number",
    "documentId": "string",
    "userId": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "document": {
      "id": "string",
      "title": "string",
      "averageRating": "number",
      "totalRatings": "number"
    }
  }
}
```

### DELETE /api/documents/:id/ratings

Xóa đánh giá

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Rating deleted successfully",
    "document": {
      "id": "string",
      "title": "string",
      "averageRating": "number",
      "totalRatings": "number"
    }
  }
}
```

### GET /api/documents/:id/ratings

Xem đánh giá của tài liệu

**Query Parameters:**

```json
{
  "rating": "number", // Lọc theo số sao (1-5)
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
    "document": {
      "id": "string",
      "title": "string",
      "averageRating": "number",
      "totalRatings": "number",
      "ratingDistribution": {
        "1": "number",
        "2": "number",
        "3": "number",
        "4": "number",
        "5": "number"
      }
    },
    "ratings": [
      {
        "id": "string",
        "rating": "number",
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
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

### GET /api/ratings/my-ratings

Đánh giá của tôi

**Query Parameters:**

```json
{
  "rating": "number", // Lọc theo số sao
  "sort": "string", // "createdAt", "rating", "documentTitle"
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
    "ratings": [
      {
        "id": "string",
        "rating": "number",
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
          },
          "averageRating": "number",
          "totalRatings": "number"
        },
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

## Comments Management

### GET /api/documents/:id/comments

Lấy bình luận của tài liệu

**Query Parameters:**

```json
{
  "parentId": "string", // ID bình luận cha (null cho bình luận gốc)
  "sort": "string", // "createdAt", "likesCount"
  "order": "string", // "asc", "desc"
  "includeReplies": "boolean", // Bao gồm trả lời
  "page": "number",
  "limit": "number"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "string",
      "title": "string",
      "totalComments": "number"
    },
    "comments": [
      {
        "id": "string",
        "content": "string",
        "isEdited": "boolean",
        "isDeleted": "boolean",
        "likesCount": "number",
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
        "parentId": "string",
        "repliesCount": "number",
        "isLiked": "boolean",
        "canEdit": "boolean",
        "canDelete": "boolean",
        "createdAt": "string",
        "updatedAt": "string",
        "editedAt": "string",
        "replies": [
          {
            "id": "string",
            "content": "string",
            "isEdited": "boolean",
            "isDeleted": "boolean",
            "likesCount": "number",
            "user": {
              "id": "string",
              "username": "string",
              "firstName": "string",
              "lastName": "string",
              "avatar": "string"
            },
            "isLiked": "boolean",
            "canEdit": "boolean",
            "canDelete": "boolean",
            "createdAt": "string",
            "updatedAt": "string",
            "editedAt": "string"
          }
        ]
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

### POST /api/documents/:id/comments

Thêm bình luận

**Body:**

```json
{
  "content": "string", // Nội dung bình luận
  "parentId": "string" // ID bình luận cha (cho trả lời)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "content": "string",
    "documentId": "string",
    "parentId": "string",
    "user": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "likesCount": "number",
    "isEdited": "boolean",
    "isDeleted": "boolean",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PUT /api/comments/:id

Chỉnh sửa bình luận

**Body:**

```json
{
  "content": "string" // Nội dung mới
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "content": "string",
    "isEdited": "boolean",
    "editedAt": "string",
    "updatedAt": "string"
  }
}
```

### DELETE /api/comments/:id

Xóa bình luận

**Query Parameters:**

```json
{
  "hardDelete": "boolean" // Xóa cứng (default: false)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Comment deleted successfully"
  }
}
```

### POST /api/comments/:id/like

Like bình luận

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "likesCount": "number",
    "isLiked": "boolean"
  }
}
```

### DELETE /api/comments/:id/like

Unlike bình luận

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "likesCount": "number",
    "isLiked": "boolean"
  }
}
```

### GET /api/comments/my-comments

Bình luận của tôi

**Query Parameters:**

```json
{
  "documentId": "string", // Lọc theo tài liệu
  "sort": "string", // "createdAt", "likesCount"
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
    "comments": [
      {
        "id": "string",
        "content": "string",
        "isEdited": "boolean",
        "isDeleted": "boolean",
        "likesCount": "number",
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
          }
        },
        "parentId": "string",
        "repliesCount": "number",
        "createdAt": "string",
        "updatedAt": "string",
        "editedAt": "string"
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

### GET /api/comments/replies/:id

Lấy trả lời của bình luận

**Query Parameters:**

```json
{
  "sort": "string", // "createdAt", "likesCount"
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
    "parentComment": {
      "id": "string",
      "content": "string",
      "user": {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string",
        "avatar": "string"
      },
      "createdAt": "string"
    },
    "replies": [
      {
        "id": "string",
        "content": "string",
        "isEdited": "boolean",
        "isDeleted": "boolean",
        "likesCount": "number",
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
        "isLiked": "boolean",
        "canEdit": "boolean",
        "canDelete": "boolean",
        "createdAt": "string",
        "updatedAt": "string",
        "editedAt": "string"
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

### POST /api/comments/:id/report

Báo cáo bình luận

**Body:**

```json
{
  "reason": "string", // Lý do báo cáo
  "description": "string" // Mô tả chi tiết
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Comment reported successfully"
  }
}
```

### GET /api/comments/mentions

Bình luận có mention tôi

**Query Parameters:**

```json
{
  "sort": "string", // "createdAt"
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
    "mentions": [
      {
        "id": "string",
        "content": "string",
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
        "document": {
          "id": "string",
          "title": "string",
          "thumbnailPath": "string"
        },
        "createdAt": "string"
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
