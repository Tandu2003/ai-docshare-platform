# Collaboration & Sharing API

## Collaboration Management

### POST /api/documents/:id/collaborate

Gửi lời mời cộng tác

**Body:**

```json
{
  "receiverId": "string", // ID người nhận
  "type": "string", // "SHARE", "REVIEW", "COLLABORATE"
  "message": "string", // Tin nhắn kèm theo
  "permissions": "string[]", // ["view", "comment", "edit"]
  "expiresAt": "string" // Thời gian hết hạn (ISO 8601)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "documentId": "string",
    "senderId": "string",
    "receiverId": "string",
    "type": "string",
    "status": "string",
    "message": "string",
    "permissions": "string[]",
    "expiresAt": "string",
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
      }
    },
    "receiver": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    }
  }
}
```

### GET /api/collaborations/received

Lời mời cộng tác đã nhận

**Query Parameters:**

```json
{
  "status": "string", // "PENDING", "ACCEPTED", "DECLINED", "EXPIRED"
  "type": "string", // "SHARE", "REVIEW", "COLLABORATE"
  "sort": "string", // "createdAt", "expiresAt"
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
    "collaborations": [
      {
        "id": "string",
        "documentId": "string",
        "senderId": "string",
        "receiverId": "string",
        "type": "string",
        "status": "string",
        "message": "string",
        "permissions": "string[]",
        "expiresAt": "string",
        "respondedAt": "string",
        "createdAt": "string",
        "updatedAt": "string",
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
          }
        },
        "sender": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
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

### GET /api/collaborations/sent

Lời mời cộng tác đã gửi

**Query Parameters:**

```json
{
  "status": "string", // "PENDING", "ACCEPTED", "DECLINED", "EXPIRED"
  "type": "string", // "SHARE", "REVIEW", "COLLABORATE"
  "sort": "string", // "createdAt", "expiresAt"
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
    "collaborations": [
      {
        "id": "string",
        "documentId": "string",
        "senderId": "string",
        "receiverId": "string",
        "type": "string",
        "status": "string",
        "message": "string",
        "permissions": "string[]",
        "expiresAt": "string",
        "respondedAt": "string",
        "createdAt": "string",
        "updatedAt": "string",
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
          }
        },
        "receiver": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
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

### PUT /api/collaborations/:id/respond

Phản hồi lời mời cộng tác

**Body:**

```json
{
  "action": "string", // "accept", "decline"
  "message": "string" // Tin nhắn phản hồi (optional)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "respondedAt": "string",
    "message": "Collaboration request responded successfully"
  }
}
```

### DELETE /api/collaborations/:id

Hủy lời mời cộng tác

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Collaboration request cancelled successfully"
  }
}
```

### GET /api/collaborations/:id

Chi tiết lời mời cộng tác

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "documentId": "string",
    "senderId": "string",
    "receiverId": "string",
    "type": "string",
    "status": "string",
    "message": "string",
    "permissions": "string[]",
    "expiresAt": "string",
    "respondedAt": "string",
    "createdAt": "string",
    "updatedAt": "string",
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
      }
    },
    "sender": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "receiver": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "canRespond": "boolean",
    "canCancel": "boolean"
  }
}
```

## Document Sharing

### POST /api/documents/:id/share

Chia sẻ tài liệu

**Body:**

```json
{
  "type": "string", // "public", "private", "restricted"
  "recipients": "string[]", // Mảng email hoặc username
  "message": "string", // Tin nhắn chia sẻ
  "permissions": "string[]", // ["view", "download", "comment"]
  "expiresAt": "string", // Thời gian hết hạn (optional)
  "password": "string" // Mật khẩu bảo vệ (optional)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "shareId": "string",
    "shareUrl": "string",
    "type": "string",
    "recipients": "string[]",
    "permissions": "string[]",
    "expiresAt": "string",
    "hasPassword": "boolean",
    "createdAt": "string"
  }
}
```

### GET /api/documents/:id/shares

Danh sách chia sẻ của tài liệu

**Query Parameters:**

```json
{
  "status": "string", // "active", "expired", "all"
  "sort": "string", // "createdAt", "expiresAt"
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
    "shares": [
      {
        "id": "string",
        "shareId": "string",
        "shareUrl": "string",
        "type": "string",
        "recipients": "string[]",
        "permissions": "string[]",
        "expiresAt": "string",
        "hasPassword": "boolean",
        "isActive": "boolean",
        "viewCount": "number",
        "downloadCount": "number",
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

### DELETE /api/documents/:id/shares/:shareId

Hủy chia sẻ tài liệu

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Share link revoked successfully"
  }
}
```

### GET /api/shared/:shareId

Truy cập tài liệu được chia sẻ

**Query Parameters:**

```json
{
  "password": "string" // Mật khẩu (nếu có)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "shareId": "string",
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
      "createdAt": "string",
      "updatedAt": "string"
    },
    "permissions": "string[]",
    "expiresAt": "string",
    "isExpired": "boolean",
    "canView": "boolean",
    "canDownload": "boolean",
    "canComment": "boolean"
  }
}
```

### POST /api/shared/:shareId/access

Ghi nhận truy cập tài liệu chia sẻ

**Body:**

```json
{
  "action": "string", // "view", "download"
  "password": "string" // Mật khẩu (nếu có)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Access recorded successfully",
    "viewCount": "number",
    "downloadCount": "number"
  }
}
```

## Team Collaboration

### POST /api/teams

Tạo nhóm cộng tác

**Body:**

```json
{
  "name": "string",
  "description": "string",
  "members": "string[]", // Mảng user ID
  "permissions": "string[]" // ["view", "upload", "edit", "admin"]
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
    "ownerId": "string",
    "memberCount": "number",
    "documentCount": "number",
    "createdAt": "string",
    "updatedAt": "string",
    "members": [
      {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string",
        "avatar": "string",
        "role": "string",
        "permissions": "string[]",
        "joinedAt": "string"
      }
    ]
  }
}
```

### GET /api/teams

Danh sách nhóm của tôi

**Query Parameters:**

```json
{
  "role": "string", // "owner", "member", "admin"
  "sort": "string", // "name", "createdAt", "memberCount"
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
    "teams": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "ownerId": "string",
        "memberCount": "number",
        "documentCount": "number",
        "myRole": "string",
        "myPermissions": "string[]",
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

### GET /api/teams/:id

Chi tiết nhóm

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "description": "string",
    "ownerId": "string",
    "memberCount": "number",
    "documentCount": "number",
    "createdAt": "string",
    "updatedAt": "string",
    "owner": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "members": [
      {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string",
        "avatar": "string",
        "role": "string",
        "permissions": "string[]",
        "joinedAt": "string"
      }
    ],
    "myRole": "string",
    "myPermissions": "string[]",
    "canInvite": "boolean",
    "canEdit": "boolean",
    "canDelete": "boolean"
  }
}
```

### POST /api/teams/:id/invite

Mời thành viên vào nhóm

**Body:**

```json
{
  "userIds": "string[]", // Mảng user ID
  "role": "string", // "member", "admin"
  "permissions": "string[]", // ["view", "upload", "edit"]
  "message": "string" // Tin nhắn mời
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Invitations sent successfully",
    "invitedCount": "number",
    "invitations": [
      {
        "id": "string",
        "userId": "string",
        "status": "string",
        "sentAt": "string"
      }
    ]
  }
}
```

### PUT /api/teams/:id/members/:userId

Cập nhật quyền thành viên

**Body:**

```json
{
  "role": "string", // "member", "admin"
  "permissions": "string[]" // ["view", "upload", "edit"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Member permissions updated successfully"
  }
}
```

### DELETE /api/teams/:id/members/:userId

Xóa thành viên khỏi nhóm

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Member removed from team successfully"
  }
}
```

### GET /api/teams/:id/documents

Tài liệu của nhóm

**Query Parameters:**

```json
{
  "uploaderId": "string", // Lọc theo người upload
  "categoryId": "string", // Lọc theo danh mục
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
    "team": {
      "id": "string",
      "name": "string",
      "documentCount": "number"
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
        "tags": "string[]",
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
