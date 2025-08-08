# Reports & Moderation API

## User Reports

### POST /api/reports

Báo cáo tài liệu/người dùng

**Body:**

```json
{
  "type": "string", // "SPAM", "INAPPROPRIATE_CONTENT", "COPYRIGHT_VIOLATION", "HARASSMENT", "FAKE_DOCUMENT", "OTHER"
  "reason": "string", // Lý do báo cáo
  "description": "string", // Mô tả chi tiết
  "documentId": "string", // ID tài liệu (optional)
  "reportedUserId": "string", // ID người dùng bị báo cáo (optional)
  "evidence": "string[]" // Mảng URL bằng chứng (optional)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "type": "string",
    "reason": "string",
    "description": "string",
    "status": "string",
    "createdAt": "string",
    "document": {
      "id": "string",
      "title": "string",
      "uploader": {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string"
      }
    },
    "reportedUser": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string"
    }
  }
}
```

### GET /api/reports/my-reports

Báo cáo đã gửi

**Query Parameters:**

```json
{
  "type": "string", // Lọc theo loại báo cáo
  "status": "string", // "PENDING", "INVESTIGATING", "RESOLVED", "DISMISSED"
  "sort": "string", // "createdAt", "status"
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
    "reports": [
      {
        "id": "string",
        "type": "string",
        "reason": "string",
        "description": "string",
        "status": "string",
        "adminNotes": "string",
        "resolvedAt": "string",
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
          }
        },
        "reportedUser": {
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

### PUT /api/reports/:id

Cập nhật báo cáo

**Body:**

```json
{
  "description": "string", // Mô tả mới
  "evidence": "string[]" // Bằng chứng bổ sung
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "description": "string",
    "evidence": "string[]",
    "updatedAt": "string"
  }
}
```

### GET /api/reports/:id

Chi tiết báo cáo

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "type": "string",
    "reason": "string",
    "description": "string",
    "status": "string",
    "adminNotes": "string",
    "resolvedAt": "string",
    "resolvedById": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "reporter": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "document": {
      "id": "string",
      "title": "string",
      "description": "string",
      "uploader": {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string"
      }
    },
    "reportedUser": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string"
    },
    "resolvedBy": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string"
    },
    "canUpdate": "boolean"
  }
}
```

## Admin Moderation

### GET /api/admin/reports

Danh sách báo cáo (Admin only)

**Query Parameters:**

```json
{
  "type": "string", // Lọc theo loại báo cáo
  "status": "string", // "PENDING", "INVESTIGATING", "RESOLVED", "DISMISSED"
  "documentId": "string", // Lọc theo tài liệu
  "reportedUserId": "string", // Lọc theo người dùng bị báo cáo
  "reporterId": "string", // Lọc theo người báo cáo
  "sort": "string", // "createdAt", "status", "type"
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
      "investigatingReports": "number",
      "resolvedReports": "number",
      "dismissedReports": "number"
    },
    "reports": [
      {
        "id": "string",
        "type": "string",
        "reason": "string",
        "description": "string",
        "status": "string",
        "adminNotes": "string",
        "resolvedAt": "string",
        "resolvedById": "string",
        "createdAt": "string",
        "updatedAt": "string",
        "reporter": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
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
        },
        "reportedUser": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string",
          "avatar": "string"
        },
        "resolvedBy": {
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

### PUT /api/admin/reports/:id/status

Cập nhật trạng thái báo cáo (Admin only)

**Body:**

```json
{
  "status": "string", // "INVESTIGATING", "RESOLVED", "DISMISSED"
  "adminNotes": "string", // Ghi chú của admin
  "action": "string" // "warn_user", "delete_document", "ban_user", "none"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "adminNotes": "string",
    "resolvedAt": "string",
    "action": "string",
    "message": "Report status updated successfully"
  }
}
```

### POST /api/admin/reports/:id/resolve

Giải quyết báo cáo (Admin only)

**Body:**

```json
{
  "resolution": "string", // "VALID", "INVALID", "PARTIAL"
  "adminNotes": "string", // Ghi chú của admin
  "actions": {
    "warnUser": "boolean", // Cảnh cáo người dùng
    "deleteDocument": "boolean", // Xóa tài liệu
    "banUser": "boolean", // Cấm người dùng
    "banDuration": "number" // Thời gian cấm (ngày)
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "status": "string",
    "resolution": "string",
    "adminNotes": "string",
    "resolvedAt": "string",
    "actions": {
      "warnUser": "boolean",
      "deleteDocument": "boolean",
      "banUser": "boolean",
      "banDuration": "number"
    },
    "message": "Report resolved successfully"
  }
}
```

### GET /api/admin/reports/:id

Chi tiết báo cáo (Admin only)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "type": "string",
    "reason": "string",
    "description": "string",
    "status": "string",
    "adminNotes": "string",
    "resolvedAt": "string",
    "resolvedById": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "reporter": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string",
      "email": "string",
      "isActive": "boolean"
    },
    "document": {
      "id": "string",
      "title": "string",
      "description": "string",
      "fileName": "string",
      "fileSize": "number",
      "mimeType": "string",
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
      "isPublic": "boolean",
      "isApproved": "boolean",
      "createdAt": "string"
    },
    "reportedUser": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string",
      "avatar": "string",
      "email": "string",
      "isActive": "boolean",
      "role": {
        "id": "string",
        "name": "string"
      }
    },
    "resolvedBy": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string"
    },
    "relatedReports": [
      {
        "id": "string",
        "type": "string",
        "status": "string",
        "createdAt": "string"
      }
    ]
  }
}
```

## Document Moderation

### GET /api/admin/documents/pending

Tài liệu chờ duyệt (Admin only)

**Query Parameters:**

```json
{
  "categoryId": "string", // Lọc theo danh mục
  "uploaderId": "string", // Lọc theo người upload
  "sort": "string", // "createdAt", "title", "uploader"
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
      "pendingDocuments": "number",
      "rejectedDocuments": "number",
      "approvedToday": "number"
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
          "avatar": "string",
          "email": "string",
          "isVerified": "boolean"
        },
        "category": {
          "id": "string",
          "name": "string"
        },
        "tags": "string[]",
        "isPublic": "boolean",
        "isPremium": "boolean",
        "isApproved": "boolean",
        "createdAt": "string",
        "updatedAt": "string",
        "aiAnalysis": {
          "summary": "string",
          "keyPoints": "string[]",
          "difficulty": "string",
          "confidence": "number"
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

### PUT /api/admin/documents/:id/approve

Duyệt tài liệu (Admin only)

**Body:**

```json
{
  "notes": "string", // Ghi chú (optional)
  "autoApproveSimilar": "boolean" // Tự động duyệt tài liệu tương tự
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "isApproved": "boolean",
    "approvedAt": "string",
    "approvedBy": "string",
    "notes": "string",
    "message": "Document approved successfully"
  }
}
```

### PUT /api/admin/documents/:id/reject

Từ chối tài liệu (Admin only)

**Body:**

```json
{
  "reason": "string", // Lý do từ chối
  "notes": "string", // Ghi chú chi tiết
  "notifyUser": "boolean" // Thông báo cho người dùng
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "isApproved": "boolean",
    "rejectedAt": "string",
    "rejectedBy": "string",
    "reason": "string",
    "notes": "string",
    "message": "Document rejected successfully"
  }
}
```

### DELETE /api/admin/documents/:id

Xóa tài liệu vi phạm (Admin only)

**Body:**

```json
{
  "reason": "string", // Lý do xóa
  "notifyUser": "boolean", // Thông báo cho người dùng
  "banUser": "boolean", // Cấm người dùng
  "banDuration": "number" // Thời gian cấm (ngày)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Document deleted successfully",
    "userBanned": "boolean",
    "banDuration": "number"
  }
}
```

### POST /api/admin/documents/batch-approve

Duyệt hàng loạt tài liệu (Admin only)

**Body:**

```json
{
  "documentIds": "string[]", // Mảng ID tài liệu
  "notes": "string", // Ghi chú chung
  "autoApproveSimilar": "boolean"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "approvedCount": "number",
    "failedCount": "number",
    "failedDocuments": [
      {
        "id": "string",
        "error": "string"
      }
    ],
    "message": "Batch approval completed"
  }
}
```

### POST /api/admin/documents/batch-reject

Từ chối hàng loạt tài liệu (Admin only)

**Body:**

```json
{
  "documentIds": "string[]", // Mảng ID tài liệu
  "reason": "string", // Lý do từ chối
  "notes": "string", // Ghi chú
  "notifyUsers": "boolean"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "rejectedCount": "number",
    "failedCount": "number",
    "failedDocuments": [
      {
        "id": "string",
        "error": "string"
      }
    ],
    "message": "Batch rejection completed"
  }
}
```

## User Moderation

### GET /api/admin/users/flagged

Người dùng bị báo cáo (Admin only)

**Query Parameters:**

```json
{
  "status": "string", // "active", "warned", "banned"
  "sort": "string", // "reportCount", "createdAt", "lastLoginAt"
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
    "users": [
      {
        "id": "string",
        "username": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "avatar": "string",
        "isActive": "boolean",
        "isVerified": "boolean",
        "role": {
          "id": "string",
          "name": "string"
        },
        "createdAt": "string",
        "lastLoginAt": "string",
        "moderation": {
          "reportCount": "number",
          "warningCount": "number",
          "banCount": "number",
          "currentBan": {
            "reason": "string",
            "startDate": "string",
            "endDate": "string",
            "isActive": "boolean"
          }
        },
        "stats": {
          "documentCount": "number",
          "downloadCount": "number",
          "ratingCount": "number"
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

### POST /api/admin/users/:id/warn

Cảnh cáo người dùng (Admin only)

**Body:**

```json
{
  "reason": "string", // Lý do cảnh cáo
  "message": "string", // Tin nhắn cảnh cáo
  "severity": "string" // "low", "medium", "high"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "warningCount": "number",
    "message": "User warned successfully"
  }
}
```

### POST /api/admin/users/:id/ban

Cấm người dùng (Admin only)

**Body:**

```json
{
  "reason": "string", // Lý do cấm
  "duration": "number", // Thời gian cấm (ngày)
  "permanent": "boolean", // Cấm vĩnh viễn
  "message": "string" // Tin nhắn thông báo
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "banCount": "number",
    "banEndDate": "string",
    "isPermanent": "boolean",
    "message": "User banned successfully"
  }
}
```

### POST /api/admin/users/:id/unban

Bỏ cấm người dùng (Admin only)

**Body:**

```json
{
  "reason": "string" // Lý do bỏ cấm
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "message": "User unbanned successfully"
  }
}
```

### GET /api/admin/moderation/queue

Hàng đợi kiểm duyệt (Admin only)

**Response:**

```json
{
  "success": true,
  "data": {
    "pendingDocuments": "number",
    "pendingReports": "number",
    "flaggedUsers": "number",
    "recentActivity": [
      {
        "type": "string", // "document_approved", "document_rejected", "user_warned", "user_banned"
        "resourceId": "string",
        "resourceType": "string",
        "adminId": "string",
        "adminName": "string",
        "timestamp": "string",
        "details": {}
      }
    ]
  }
}
```
