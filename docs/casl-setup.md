# CASL RBAC Setup Guide

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented using CASL
(Conditional Access Control Lists) for the AI DocShare Platform.

## Architecture

### Backend (NestJS)

- **AbilityFactory**: Creates CASL abilities based on user roles and permissions
- **CaslGuard**: Global guard that checks permissions before allowing access
- **RoleService**: Manages roles and permissions in the database
- **Decorators**: `@CheckPolicy` and `@CheckPolicies` for fine-grained control

### Frontend (React)

- **CaslProvider**: Context provider that wraps the app with user abilities
- **useCasl**: Hook to access current user abilities
- **useCan**: Hook to check specific permissions
- **Can**: Component for conditional rendering based on permissions

## Default Roles

### Admin

- **Permissions**: `manage all`
- **Description**: Full system access

### Moderator

- **Permissions**:
  - `read all`
  - `update Document` (unapproved documents)
  - `approve Document`
  - `moderate Comment`
  - `moderate User`
- **Description**: Content moderation and user management

### Publisher

- **Permissions**:
  - `create Document`
  - `read Document`
  - `update Document` (own documents)
  - `delete Document` (own documents)
  - `upload File`
  - `read File` (own files)
- **Description**: Document creation and management

### User

- **Permissions**:
  - `read Document` (public, approved)
  - `create Comment`
  - `update Comment` (own comments)
  - `delete Comment` (own comments)
  - `create Rating`
  - `update Rating` (own ratings)
  - `create Bookmark`
  - `delete Bookmark` (own bookmarks)
  - `download Document` (public, approved)
- **Description**: Basic user interactions

## Usage Examples

### Backend Controller

```typescript
@Post('create')
@CheckPolicy({ action: 'create', subject: 'Document' })
async createDocument(@Body() dto: CreateDocumentDto) {
  // Only users with 'create Document' permission can access
}
```

### Frontend Component

```typescript
import { useCan, Can } from '@/lib/casl';

function DocumentActions({ document }) {
  const canEdit = useCan('update', 'Document', { uploaderId: document.uploaderId });

  return (
    <div>
      {canEdit && <Button>Edit Document</Button>}

      <Can I='delete' do='delete' on='Document' this={{ uploaderId: document.uploaderId }}>
        <Button variant='destructive'>Delete Document</Button>
      </Can>
    </div>
  );
}
```

## Database Schema

The system uses the existing `Role` model with a `permissions` JSON field:

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  permissions Json     @default("[]") // Array of permission objects
  isActive    Boolean  @default(true)
  // ... other fields
}
```

## Permission Format

```typescript
interface Permission {
  action: Actions; // 'create' | 'read' | 'update' | 'delete' | etc.
  subject: Subjects; // 'Document' | 'User' | 'File' | etc.
  conditions?: Record<string, any>; // Optional conditions
}
```

## Dynamic Conditions

Permissions can include dynamic conditions that reference request context:

```typescript
// User can only update their own documents
{
  action: 'update',
  subject: 'Document',
  conditions: { uploaderId: '$user.id' }
}

// User can only delete their own comments
{
  action: 'delete',
  subject: 'Comment',
  conditions: { userId: '$user.id' }
}
```

## Setup Instructions

### 1. Initialize Default Roles

```bash
cd backend
npm run init:roles
```

### 2. Start the Backend

```bash
npm run start:dev
```

### 3. Start the Frontend

```bash
cd ../frontend
npm run dev
```

## Testing Permissions

1. **Login as different users** with different roles
2. **Navigate to Permission Demo** component
3. **Check permission status** for various actions
4. **Verify conditional rendering** based on permissions

## Security Features

- **JWT Authentication**: Required for all protected routes
- **Role-based Access**: Permissions tied to user roles
- **Conditional Permissions**: Fine-grained control based on resource ownership
- **Global Guard**: Automatic permission checking on all endpoints
- **Frontend Protection**: UI elements hidden based on permissions

## Best Practices

1. **Always use decorators** for backend permission checks
2. **Use conditional permissions** for resource ownership
3. **Implement frontend checks** for better UX
4. **Test with different roles** to ensure proper access control
5. **Log permission violations** for security monitoring

## Troubleshooting

### Common Issues

1. **Permission denied errors**: Check user role and permissions
2. **Frontend not updating**: Ensure CASL provider is properly configured
3. **Database errors**: Verify role initialization script ran successfully

### Debug Commands

```bash
# Check user roles
GET /api/roles

# Check specific user role
GET /api/roles/user/{userId}

# Initialize default roles
npm run init:roles
```

## Future Enhancements

- **Permission inheritance** between roles
- **Time-based permissions** (temporary access)
- **Audit logging** for permission changes
- **Permission templates** for common use cases
- **API rate limiting** based on permissions
