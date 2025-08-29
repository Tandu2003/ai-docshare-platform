# CASL RBAC Usage Guide

## Overview

This guide explains how to use the CASL (Conditional Access Control Lists) Role-Based Access Control
(RBAC) system implemented in the AI DocShare Platform.

## System Architecture

### Backend (NestJS)

- **CASL Module**: `backend/src/common/casl/`
- **Ability Factory**: Merges permissions from all roles of the user
- **CASL Guard**: Protects API endpoints
- **Policy Decorators**: `@CheckPolicy` and `@CheckPolicies`

### Frontend (React)

- **CASL Context**: Provides abilities throughout the app
- **Permission Hooks**: `useCan`, `useCasl`
- **Conditional Rendering**: Based on user permissions

## Default Roles and Permissions

### Admin Role

- **Permissions**: `manage:all` (full access to everything)
- **Use Case**: System administrators, developers

### Moderator Role

- **Permissions**:
  - `read:all`
  - `update:Document` (unapproved documents)
  - `approve:Document`
  - `moderate:Comment`
  - `moderate:User`
- **Use Case**: Content moderators, community managers

### Publisher Role

- **Permissions**:
  - `create:Document`
  - `update:Document` (own documents)
  - `delete:Document` (own documents)
  - `upload:File`
  - `read:Document` (own documents)
  - `read:File` (own files)
- **Use Case**: Content creators, document publishers

### User Role

- **Permissions**:
  - `read:Document` (public, approved documents)
  - `create:Comment`
  - `update:Comment` (own comments)
  - `delete:Comment` (own comments)
  - `create:Rating`
  - `update:Rating` (own ratings)
  - `create:Bookmark`
  - `delete:Bookmark` (own bookmarks)
  - `download:Document` (public, approved documents)
- **Use Case**: Regular users, document consumers

## Backend Usage

### Protecting API Endpoints (Protected routes)

```typescript
import { CheckPolicy } from '@/common/casl';

@Controller('documents')
export class DocumentsController {
  @Post()
  @CheckPolicy({ action: 'create', subject: 'Document' })
  async createDocument(@Body() createDocumentDto: CreateDocumentDto) {
    // Only users with 'create:Document' permission can access
  }

  @Put(':id')
  @CheckPolicy({ action: 'update', subject: 'Document' })
  async updateDocument(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    // Only users with 'update:Document' permission can access
  }

  // Require login + permission to download (even for public documents)
  @UseGuards(JwtAuthGuard)
  @Post(':documentId/download')
  @CheckPolicy({ action: 'download', subject: 'Document' })
  async downloadDocument(...) {}
}
```

### Checking Permissions in Services

```typescript
import { AbilityFactory } from '@/common/casl';

@Injectable()
export class DocumentService {
  constructor(private abilityFactory: AbilityFactory) {}

  async canUserAccessDocument(user: any, documentId: string): Promise<boolean> {
    const document = await this.getDocument(documentId);

    return this.abilityFactory.can(user, 'read', 'Document', {
      isPublic: document.isPublic,
      uploaderId: document.uploaderId,
    });
  }
}
```

### Custom Permission Conditions

```typescript
// In ability.factory.ts
case 'publisher':
  can('update', 'Document', { uploaderId: user.id }); // Can only update own documents
  can('delete', 'Document', { uploaderId: user.id }); // Can only delete own documents
  break;
```

## Frontend Usage

### Using Permission Hooks

```typescript
import { useCan, useCasl } from '@/lib/casl';

function DocumentActions() {
  const { user } = useCasl();
  const canCreate = useCan('create', 'Document');
  const canModerate = useCan('moderate', 'User');

  return (
    <div>
      {canCreate && <Button>Create Document</Button>}

      {canModerate && <Button variant='outline'>Moderate Users</Button>}
    </div>
  );
}
```

### Conditional Rendering with CASL

```typescript
import { CanComponent } from '@/lib/casl';

function AdminPanel() {
  return (
    <CanComponent I='can' do='manage' on='all'>
      <div className='admin-panel'>
        <h2>System Administration</h2>
        <UserManagement />
        <SystemSettings />
      </div>
    </CanComponent>
  );
}
```

### Accessing User Context (Multi-role)

```typescript
import { useCasl } from '@/lib/casl';

function UserProfile() {
  const { user, ability } = useCasl();

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>
        {user.firstName} {user.lastName}
      </h1>
      <div className='roles'>
        {user.roles?.map((role) => (
          <div key={role.id}>
            <p>Role: {role.name}</p>
            <div className='permissions'>
              {role.permissions?.map((p, index) => (
                <Badge key={index}>
                  {p.action} {p.subject}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing Permissions

### Backend Testing

```typescript
// Test if user can perform action
const canCreate = abilityFactory.can(user, 'create', 'Document');
const canUpdateOwn = abilityFactory.can(user, 'update', 'Document', { uploaderId: user.id });

// Test with conditions
const canReadPrivate = abilityFactory.can(user, 'read', 'Document', { isPublic: false });
```

### Frontend Testing

```typescript
// Test permissions in components
const canUpload = useCan('upload', 'File');
const canModerate = useCan('moderate', 'Comment');

// Conditional rendering
{
  canUpload && <FileUpload />;
}
{
  canModerate && <ModerationPanel />;
}
```

## Adding New Permissions

### 1. Update Types

```typescript
// backend/src/common/casl/ability.factory.ts
export type Actions =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'approve'
  | 'moderate'
  | 'upload'
  | 'download'
  | 'comment'
  | 'rate'
  | 'bookmark'
  | 'share'
  | 'export' // New action
  | 'archive'; // New action

export type Subjects =
  | 'User'
  | 'Document'
  | 'File'
  | 'Category'
  | 'Comment'
  | 'Rating'
  | 'Bookmark'
  | 'Notification'
  | 'SystemSetting'
  | 'Report' // New subject
  | 'Analytics' // New subject
  | 'all';
```

### 2. Update Role Permissions

```typescript
// In ability.factory.ts
case 'publisher':
  can('export', 'Document', { uploaderId: user.id }); // Can export own documents
  can('archive', 'Document', { uploaderId: user.id }); // Can archive own documents
  break;
```

### 3. Update Database

```typescript
// Add to default roles in init-roles.ts
const publisherPermissions = [
  { action: 'export', subject: 'Document' },
  { action: 'archive', subject: 'Document' },
];
```

## Best Practices

### 1. Always Check Permissions

- Never assume user has access
- Use `@CheckPolicy` decorators on all protected endpoints
- Check permissions in services before performing actions

### 2. Use Specific Conditions

- Instead of broad permissions, use specific conditions
- Example: `can('update', 'Document', { uploaderId: user.id })`
- This ensures users can only modify their own content

### 3. Cache Abilities

- User abilities are cached in the CASL context
- Avoid recreating abilities unnecessarily
- Use the `useCasl` hook to access cached abilities

### 4. Test Permission Boundaries

- Test both positive and negative cases
- Verify conditions work correctly
- Test edge cases with different user roles

### 5. Log Permission Denials

- Log when users are denied access
- Monitor for potential security issues
- Track permission usage patterns

## Troubleshooting

### Common Issues

1. **Permission Denied (403)**

   - Check if user has the required role
   - Verify permission conditions are met
   - Check if CASL guard is properly configured

2. **TypeScript Errors**

   - Ensure Actions and Subjects types are updated
   - Check import paths for CASL modules
   - Verify interface compatibility

3. **Frontend Not Rendering**
   - Check if CASL context is properly wrapped
   - Verify user data includes role and permissions
   - Check browser console for errors

### Debug Mode

Enable debug logging in development:

```typescript
// In ability.factory.ts
if (process.env.NODE_ENV === 'development') {
  console.log('User abilities:', ability.rules);
  console.log('Permission check:', { action, subject, conditions });
}
```

## Security Considerations

1. **Server-Side Validation**: Always validate permissions on the backend
2. **Input Sanitization**: Sanitize all user inputs
3. **Audit Logging**: Log all permission checks and denials
4. **Regular Reviews**: Periodically review role permissions
5. **Principle of Least Privilege**: Grant minimum required permissions

## Conclusion

The CASL RBAC system provides a flexible and secure way to manage user permissions. By following
these guidelines, you can build robust access control into your application while maintaining
security and usability.
