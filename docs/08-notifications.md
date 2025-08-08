# Notifications API

## Notification Management

### GET /api/notifications

Danh sách thông báo

**Query Parameters:**

```json
{
  "type": "string", // Lọc theo loại: "comment", "rating", "system", "document_approved", "collaboration"
  "isRead": "boolean", // Lọc theo trạng thái đọc
  "sort": "string", // "createdAt", "isRead"
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
      "totalNotifications": "number",
      "unreadCount": "number",
      "readCount": "number"
    },
    "notifications": [
      {
        "id": "string",
        "type": "string",
        "title": "string",
        "message": "string",
        "data": {},
        "isRead": "boolean",
        "readAt": "string",
        "createdAt": "string",
        "actionUrl": "string",
        "actionText": "string"
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

### PUT /api/notifications/:id/read

Đánh dấu đã đọc

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "string",
    "isRead": "boolean",
    "readAt": "string",
    "message": "Notification marked as read"
  }
}
```

### PUT /api/notifications/read-all

Đánh dấu tất cả đã đọc

**Query Parameters:**

```json
{
  "type": "string" // Lọc theo loại thông báo (optional)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "readCount": "number",
    "message": "All notifications marked as read"
  }
}
```

### DELETE /api/notifications/:id

Xóa thông báo

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Notification deleted successfully"
  }
}
```

### DELETE /api/notifications/clear-read

Xóa tất cả thông báo đã đọc

**Query Parameters:**

```json
{
  "type": "string", // Lọc theo loại thông báo (optional)
  "olderThan": "string" // Xóa thông báo cũ hơn (ISO 8601)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deletedCount": "number",
    "message": "Read notifications cleared successfully"
  }
}
```

### GET /api/notifications/unread-count

Số thông báo chưa đọc

**Response:**

```json
{
  "success": true,
  "data": {
    "unreadCount": "number",
    "byType": {
      "comment": "number",
      "rating": "number",
      "system": "number",
      "document_approved": "number",
      "collaboration": "number"
    }
  }
}
```

### GET /api/notifications/settings

Cài đặt thông báo

**Response:**

```json
{
  "success": true,
  "data": {
    "email": {
      "comment": "boolean",
      "rating": "boolean",
      "system": "boolean",
      "document_approved": "boolean",
      "collaboration": "boolean",
      "marketing": "boolean"
    },
    "push": {
      "comment": "boolean",
      "rating": "boolean",
      "system": "boolean",
      "document_approved": "boolean",
      "collaboration": "boolean"
    },
    "inApp": {
      "comment": "boolean",
      "rating": "boolean",
      "system": "boolean",
      "document_approved": "boolean",
      "collaboration": "boolean"
    }
  }
}
```

### PUT /api/notifications/settings

Cập nhật cài đặt thông báo

**Body:**

```json
{
  "email": {
    "comment": "boolean",
    "rating": "boolean",
    "system": "boolean",
    "document_approved": "boolean",
    "collaboration": "boolean",
    "marketing": "boolean"
  },
  "push": {
    "comment": "boolean",
    "rating": "boolean",
    "system": "boolean",
    "document_approved": "boolean",
    "collaboration": "boolean"
  },
  "inApp": {
    "comment": "boolean",
    "rating": "boolean",
    "system": "boolean",
    "document_approved": "boolean",
    "collaboration": "boolean"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Notification settings updated successfully"
  }
}
```

## Notification Types

### Comment Notifications

```json
{
  "id": "string",
  "type": "comment",
  "title": "New comment on your document",
  "message": "John Doe commented on 'Introduction to AI'",
  "data": {
    "documentId": "string",
    "documentTitle": "string",
    "commentId": "string",
    "commenterId": "string",
    "commenterName": "string",
    "commentContent": "string"
  },
  "actionUrl": "/documents/123",
  "actionText": "View comment"
}
```

### Rating Notifications

```json
{
  "id": "string",
  "type": "rating",
  "title": "New rating on your document",
  "message": "Your document 'Machine Learning Basics' received a 5-star rating",
  "data": {
    "documentId": "string",
    "documentTitle": "string",
    "rating": "number",
    "raterId": "string",
    "raterName": "string"
  },
  "actionUrl": "/documents/123",
  "actionText": "View document"
}
```

### System Notifications

```json
{
  "id": "string",
  "type": "system",
  "title": "System Maintenance",
  "message": "Scheduled maintenance on Sunday, 2:00 AM - 4:00 AM",
  "data": {
    "maintenanceType": "scheduled",
    "startTime": "string",
    "endTime": "string",
    "affectedServices": "string[]"
  },
  "actionUrl": "/maintenance",
  "actionText": "Learn more"
}
```

### Document Approval Notifications

```json
{
  "id": "string",
  "type": "document_approved",
  "title": "Document approved",
  "message": "Your document 'Advanced Python Programming' has been approved",
  "data": {
    "documentId": "string",
    "documentTitle": "string",
    "approvedBy": "string",
    "approvedAt": "string",
    "notes": "string"
  },
  "actionUrl": "/documents/123",
  "actionText": "View document"
}
```

### Collaboration Notifications

```json
{
  "id": "string",
  "type": "collaboration",
  "title": "Collaboration request",
  "message": "Jane Smith wants to collaborate on 'Data Science Project'",
  "data": {
    "collaborationId": "string",
    "documentId": "string",
    "documentTitle": "string",
    "senderId": "string",
    "senderName": "string",
    "type": "string",
    "message": "string"
  },
  "actionUrl": "/collaborations/456",
  "actionText": "Respond"
}
```

## Real-time Notifications

### WebSocket Connection

```
ws://api.document-sharing.com/notifications
```

**Authentication:**

```json
{
  "type": "auth",
  "token": "your_jwt_token"
}
```

**Notification Event:**

```json
{
  "type": "notification",
  "data": {
    "id": "string",
    "type": "string",
    "title": "string",
    "message": "string",
    "data": {},
    "createdAt": "string"
  }
}
```

**Unread Count Update:**

```json
{
  "type": "unread_count",
  "data": {
    "unreadCount": "number"
  }
}
```

## Email Notifications

### Email Templates

**Comment Notification Email:**

```html
Subject: New comment on your document Hi {{userName}}, {{commenterName}} commented on your document
"{{documentTitle}}": "{{commentContent}}" View the comment: {{actionUrl}} Best regards, Document
Sharing Team
```

**Rating Notification Email:**

```html
Subject: New rating on your document Hi {{userName}}, Your document "{{documentTitle}}" received a
{{rating}}-star rating from {{raterName}}. View your document: {{actionUrl}} Best regards, Document
Sharing Team
```

**Document Approval Email:**

```html
Subject: Document approved Hi {{userName}}, Great news! Your document "{{documentTitle}}" has been
approved and is now live on our platform. {{#if notes}} Admin notes: {{notes}} {{/if}} View your
document: {{actionUrl}} Best regards, Document Sharing Team
```

## Push Notifications

### Push Notification Payload

```json
{
  "title": "New comment on your document",
  "body": "John Doe commented on 'Introduction to AI'",
  "icon": "/icon-192x192.png",
  "badge": "/badge-72x72.png",
  "data": {
    "url": "/documents/123",
    "type": "comment",
    "documentId": "string"
  },
  "actions": [
    {
      "action": "view",
      "title": "View"
    },
    {
      "action": "dismiss",
      "title": "Dismiss"
    }
  ]
}
```

## Notification Preferences

### Default Settings

```json
{
  "email": {
    "comment": true,
    "rating": true,
    "system": true,
    "document_approved": true,
    "collaboration": true,
    "marketing": false
  },
  "push": {
    "comment": true,
    "rating": true,
    "system": false,
    "document_approved": true,
    "collaboration": true
  },
  "inApp": {
    "comment": true,
    "rating": true,
    "system": true,
    "document_approved": true,
    "collaboration": true
  }
}
```

### Notification Frequency

```json
{
  "email": {
    "frequency": "immediate", // "immediate", "daily", "weekly"
    "batchSize": "number",
    "quietHours": {
      "enabled": "boolean",
      "start": "string", // "22:00"
      "end": "string" // "08:00"
    }
  },
  "push": {
    "frequency": "immediate",
    "quietHours": {
      "enabled": "boolean",
      "start": "string",
      "end": "string"
    }
  }
}
```

## Notification Analytics

### GET /api/notifications/analytics

Thống kê thông báo

**Query Parameters:**

```json
{
  "period": "string", // "day", "week", "month", "year"
  "type": "string" // Lọc theo loại thông báo
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSent": "number",
      "totalRead": "number",
      "totalClicked": "number",
      "openRate": "number",
      "clickRate": "number"
    },
    "byType": [
      {
        "type": "string",
        "sent": "number",
        "read": "number",
        "clicked": "number",
        "openRate": "number",
        "clickRate": "number"
      }
    ],
    "byChannel": [
      {
        "channel": "string", // "email", "push", "inApp"
        "sent": "number",
        "read": "number",
        "clicked": "number"
      }
    ],
    "trends": [
      {
        "date": "string",
        "sent": "number",
        "read": "number",
        "clicked": "number"
      }
    ]
  }
}
```
