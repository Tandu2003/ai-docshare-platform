import { AbilityBuilder, createMongoAbility, PureAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';

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
  | 'share';

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
  | 'all';

export type AppAbility = PureAbility<[Actions, Subjects | Subjects[]]>;

export interface Permission {
  action: Actions;
  subject: Subjects;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
}

@Injectable()
export class AbilityFactory {
  createForUser(user: any): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Default permissions for guest users (not logged in)
    can('read', 'Document', { isPublic: true, isApproved: true });
    can('read', 'Category', { isActive: true });
    // Files don't have isPublic - they're accessible if user can access the Document
    // Access control is at Document level, not File level

    if (!user || !user.role) {
      return build();
    }

    const role = user.role;
    const perms = role?.permissions as Permission[];
    if (perms && Array.isArray(perms)) {
      perms.forEach(permission => {
        if (permission.conditions) {
          can(permission.action, permission.subject, permission.conditions);
        } else {
          can(permission.action, permission.subject);
        }
      });
    }

    // Role-specific overrides
    switch (role?.name) {
      case 'admin':
        // Admin có toàn quyền
        can('manage', 'all');
        can('read', 'all');
        can('create', 'all');
        can('update', 'all');
        can('delete', 'all');
        can('approve', 'all');
        can('moderate', 'all');
        can('upload', 'all');
        can('download', 'all');
        can('comment', 'all');
        can('rate', 'all');
        can('bookmark', 'all');
        can('share', 'all');
        break;
      case 'user':
        // User permissions - chỉ có thể thao tác với tài liệu của mình hoặc tài liệu public
        can('read', 'Document', { isPublic: true, isApproved: true });
        can('read', 'Document', { uploaderId: user.id });
        // Allow reading document stats for dashboard
        can('read', 'Document');
        can('create', 'Document');
        can('upload', 'File');
        can('update', 'Document', { uploaderId: user.id });
        can('delete', 'Document', { uploaderId: user.id });
        can('share', 'Document', { uploaderId: user.id });
        can('create', 'Comment');
        can('update', 'Comment', { userId: user.id });
        can('delete', 'Comment', { userId: user.id });
        can('create', 'Rating');
        can('update', 'Rating', { userId: user.id });
        can('create', 'Bookmark');
        can('read', 'Bookmark', { userId: user.id });
        can('delete', 'Bookmark', { userId: user.id });
        can('download', 'Document', { isPublic: true, isApproved: true });
        can('download', 'Document', { uploaderId: user.id });
        // Files are accessible if user can access the Document
        // No isPublic check on File - access control is at Document level
        can('read', 'File', { uploaderId: user.id });
        // Categories - users chỉ có thể đọc danh mục
        can('read', 'Category');
        break;
    }

    return build();
  }

  // Helper method to check if user can perform action on subject
  can(
    user: any,
    action: Actions,
    subject: Subjects,
    conditions?: Record<string, any>,
  ): boolean {
    const ability = this.createForUser(user);
    return ability.can(action, subject, conditions as any);
  }

  // Helper method to get user's abilities
  getAbilities(user: any): AppAbility {
    return this.createForUser(user);
  }
}
