import { AbilityBuilder, createMongoAbility, PureAbility } from '@casl/ability';

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

export interface UserRole {
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export class AbilityFactory {
  static createForUser(user: User | null): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Default permissions for all users
    can('read', 'Document', { isPublic: true });
    can('read', 'Category');
    can('read', 'File', { isPublic: true });

    if (!user || !user.role) {
      return build();
    }

    const role = user.role;
    const permissions = role.permissions;

    if (!permissions || !Array.isArray(permissions)) {
      return build();
    }

    // Apply role-based permissions
    permissions.forEach(permission => {
      if (permission.conditions) {
        can(permission.action, permission.subject, permission.conditions);
      } else {
        can(permission.action, permission.subject);
      }
    });

    // Role-specific overrides
    switch (role.name) {
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
        can('read', 'File', { isPublic: true });
        can('read', 'File', { uploaderId: user.id });
        can('read', 'Category');
        can('read', 'Notification', { userId: user.id });
        can('update', 'Notification', { userId: user.id });
        can('delete', 'Notification', { userId: user.id });
        // User có thể xem profile của mình
        can('read', 'User', { id: user.id });
        can('update', 'User', { id: user.id });
        break;
    }

    return build();
  }

  // Helper method to check if user can perform action on subject
  static can(
    user: User | null,
    action: Actions,
    subject: Subjects,
    conditions?: Record<string, any>,
  ): boolean {
    const ability = this.createForUser(user);
    return ability.can(action, subject, conditions as any);
  }

  // Helper method to get user's abilities
  static getAbilities(user: User | null): AppAbility {
    return this.createForUser(user);
  }
}
