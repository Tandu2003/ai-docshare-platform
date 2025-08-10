# User Management API

## User Management (Admin)

### GET /api/admin/users

Danh sách người dùng (Admin only)

**Query Parameters:**

```json
{
  "role": "string", // Lọc theo vai trò
  "status": "string", // "active", "inactive", "verified", "unverified"
  "search": "string", // Tìm kiếm theo tên, email, username
  "sort": "string", // "createdAt", "lastLoginAt", "documentCount", "username"
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
      "newUsers": "number"
    },
    "users": [
      {
        "id": "string",
        "username": "string",
        "email": "string",
        "firstName": "string",
        "lastName": "string",
        "avatar": "string",
        "bio": "string",
        "role": {
          "id": "string",
          "name": "string",
          "description": "string"
        },
        "isVerified": "boolean",
        "isActive": "boolean",
        "lastLoginAt": "string",
        "createdAt": "string",
        "updatedAt": "string",
        "stats": {
          "documentCount": "number",
          "downloadCount": "number",
          "viewCount": "number",
          "ratingCount": "number",
          "commentCount": "number",
          "bookmarkCount": "number"
        },
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

### GET /api/admin/users/:id

Chi tiết người dùng (Admin only)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "username": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "avatar": "string",
    "bio": "string",
    "role": {
      "id": "string",
      "name": "string",
      "description": "string",
      "permissions": "string[]"
    },
    "isVerified": "boolean",
    "isActive": "boolean",
    "lastLoginAt": "string",
    "resetToken": "string",
    "resetExpires": "string",
    "createdAt": "string",
    "updatedAt": "string",
    "stats": {
      "documentCount": "number",
      "downloadCount": "number",
      "viewCount": "number",
      "ratingCount": "number",
      "commentCount": "number",
      "bookmarkCount": "number",
      "totalDownloads": "number",
      "totalViews": "number",
      "averageRating": "number"
    },
    "moderation": {
      "reportCount": "number",
      "warningCount": "number",
      "banCount": "number",
      "currentBan": {
        "reason": "string",
        "startDate": "string",
        "endDate": "string",
        "isActive": "boolean"
      },
      "warnings": [
        {
          "id": "string",
          "reason": "string",
          "message": "string",
          "severity": "string",
          "createdAt": "string",
          "adminId": "string",
          "adminName": "string"
        }
      ],
      "bans": [
        {
          "id": "string",
          "reason": "string",
          "startDate": "string",
          "endDate": "string",
          "isActive": "boolean",
          "createdAt": "string",
          "adminId": "string",
          "adminName": "string"
        }
      ]
    },
    "recentActivity": [
      {
        "id": "string",
        "action": "string",
        "resourceType": "string",
        "resourceId": "string",
        "ipAddress": "string",
        "userAgent": "string",
        "createdAt": "string"
      }
    ]
  }
}
```

### PUT /api/admin/users/:id/status

Khóa/mở khóa tài khoản (Admin only)

**Body:**

```json
{
  "isActive": "boolean", // Trạng thái tài khoản
  "reason": "string", // Lý do khóa/mở khóa
  "notifyUser": "boolean" // Thông báo cho người dùng
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "isActive": "boolean",
    "reason": "string",
    "updatedAt": "string",
    "message": "User status updated successfully"
  }
}
```

### DELETE /api/admin/users/:id

Xóa tài khoản (Admin only)

**Body:**

```json
{
  "reason": "string", // Lý do xóa
  "deleteDocuments": "boolean", // Xóa tài liệu của người dùng
  "notifyUser": "boolean" // Thông báo cho người dùng
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully",
    "deletedDocuments": "number"
  }
}
```

### GET /api/admin/users/:id/activity

Hoạt động của người dùng (Admin only)

**Query Parameters:**

```json
{
  "action": "string", // Lọc theo hành động
  "period": "string", // "day", "week", "month", "year"
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
    "user": {
      "id": "string",
      "username": "string",
      "firstName": "string",
      "lastName": "string"
    },
    "activities": [
      {
        "id": "string",
        "action": "string",
        "resourceType": "string",
        "resourceId": "string",
        "ipAddress": "string",
        "userAgent": "string",
        "metadata": {},
        "createdAt": "string",
        "document": {
          "id": "string",
          "title": "string"
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

### PUT /api/admin/users/:id/role

Cập nhật vai trò người dùng (Admin only)

**Body:**

```json
{
  "roleId": "string", // ID vai trò mới
  "reason": "string", // Lý do thay đổi
  "notifyUser": "boolean" // Thông báo cho người dùng
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "role": {
      "id": "string",
      "name": "string",
      "description": "string"
    },
    "updatedAt": "string",
    "message": "User role updated successfully"
  }
}
```

### POST /api/admin/users/:id/verify

Xác thực người dùng (Admin only)

**Body:**

```json
{
  "reason": "string" // Lý do xác thực
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "isVerified": "boolean",
    "verifiedAt": "string",
    "message": "User verified successfully"
  }
}
```

### POST /api/admin/users/bulk-actions

Thao tác hàng loạt người dùng (Admin only)

**Body:**

```json
{
  "action": "string", // "activate", "deactivate", "verify", "delete", "change_role"
  "userIds": "string[]", // Mảng ID người dùng
  "roleId": "string", // ID vai trò (cho action change_role)
  "reason": "string", // Lý do thao tác
  "notifyUsers": "boolean" // Thông báo cho người dùng
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processedCount": "number",
    "failedCount": "number",
    "failedUsers": [
      {
        "id": "string",
        "error": "string"
      }
    ],
    "message": "Bulk action completed"
  }
}
```

## Role Management

### GET /api/admin/roles

Danh sách vai trò (Admin only)

**Response:**

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "permissions": "string[]",
        "isActive": "boolean",
        "userCount": "number",
        "createdAt": "string",
        "updatedAt": "string"
      }
    ]
  }
}
```

### POST /api/admin/roles

Tạo vai trò mới (Admin only)

**Body:**

```json
{
  "name": "string",
  "description": "string",
  "permissions": "string[]" // Mảng quyền hạn
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
    "permissions": "string[]",
    "isActive": "boolean",
    "userCount": "number",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PUT /api/admin/roles/:id

Cập nhật vai trò (Admin only)

**Body:**

```json
{
  "name": "string",
  "description": "string",
  "permissions": "string[]",
  "isActive": "boolean"
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
    "permissions": "string[]",
    "isActive": "boolean",
    "userCount": "number",
    "updatedAt": "string"
  }
}
```

### DELETE /api/admin/roles/:id

Xóa vai trò (Admin only)

**Query Parameters:**

```json
{
  "reassignTo": "string" // ID vai trò chuyển người dùng đến
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Role deleted successfully",
    "reassignedUsers": "number"
  }
}
```

## User Statistics

### GET /api/admin/users/statistics

Thống kê người dùng (Admin only)

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
      "activeUsers": "number",
      "verifiedUsers": "number",
      "newUsers": "number",
      "bannedUsers": "number"
    },
    "growth": {
      "newUsers": "number",
      "growthRate": "number",
      "retentionRate": "number"
    },
    "byRole": [
      {
        "roleId": "string",
        "roleName": "string",
        "userCount": "number",
        "percentage": "number"
      }
    ],
    "byStatus": [
      {
        "status": "string",
        "userCount": "number",
        "percentage": "number"
      }
    ],
    "trends": {
      "daily": [
        {
          "date": "string",
          "newUsers": "number",
          "activeUsers": "number",
          "verifiedUsers": "number"
        }
      ],
      "weekly": [],
      "monthly": []
    },
    "topUsers": [
      {
        "id": "string",
        "username": "string",
        "firstName": "string",
        "lastName": "string",
        "documentCount": "number",
        "totalDownloads": "number",
        "totalViews": "number",
        "averageRating": "number"
      }
    ]
  }
}
```

### GET /api/admin/users/activity-summary

Tóm tắt hoạt động người dùng (Admin only)

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "action": "string" // Lọc theo hành động
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActivities": "number",
      "uniqueUsers": "number",
      "averageActivitiesPerUser": "number"
    },
    "byAction": [
      {
        "action": "string",
        "count": "number",
        "uniqueUsers": "number"
      }
    ],
    "byHour": [
      {
        "hour": "number",
        "count": "number"
      }
    ],
    "byDay": [
      {
        "day": "string",
        "count": "number"
      }
    ],
    "recentActivity": [
      {
        "id": "string",
        "action": "string",
        "user": {
          "id": "string",
          "username": "string",
          "firstName": "string",
          "lastName": "string"
        },
        "resourceType": "string",
        "resourceId": "string",
        "createdAt": "string"
      }
    ]
  }
}
```

## User Export

### POST /api/admin/users/export

Xuất danh sách người dùng (Admin only)

**Body:**

```json
{
  "format": "string", // "csv", "excel", "pdf"
  "filters": {
    "role": "string",
    "status": "string",
    "dateFrom": "string",
    "dateTo": "string"
  },
  "fields": "string[]" // Các trường cần xuất
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
