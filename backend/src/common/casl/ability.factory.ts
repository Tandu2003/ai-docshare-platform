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

    // Default permissions for all users (including unauthenticated)
    can('read', 'Document', { isPublic: true });
    can('read', 'Category');
    can('read', 'File', { isPublic: true });
    can('create', 'Document'); // Cho phép tạo tài liệu (sẽ được kiểm tra auth ở controller level)
    can('upload', 'File'); // Cho phép upload file (sẽ được kiểm tra auth ở controller level)

    if (!user || !user.role) {
      return build();
    }

    const role = user.role;
    const perms = role?.permissions as Permission[];
    if (perms && Array.isArray(perms)) {
      perms.forEach((permission) => {
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
        can('manage', 'all');
        break;
      case 'moderator':
        can('read', 'all');
        can('update', 'Document', { isApproved: false });
        can('approve', 'Document');
        can('moderate', 'Comment');
        can('moderate', 'User');
        break;
      case 'publisher':
        can('create', 'Document');
        can('update', 'Document', { uploaderId: user.id });
        can('delete', 'Document', { uploaderId: user.id });
        can('upload', 'File');
        can('read', 'Document', { uploaderId: user.id });
        can('read', 'File', { uploaderId: user.id });
        break;
      case 'user':
        can('read', 'Document', { isPublic: true, isApproved: true });
        can('create', 'Document'); // Thêm quyền tạo tài liệu
        can('update', 'Document', { uploaderId: user.id }); // Thêm quyền cập nhật tài liệu của mình
        can('delete', 'Document', { uploaderId: user.id }); // Thêm quyền xóa tài liệu của mình
        can('upload', 'File'); // Thêm quyền upload file
        can('read', 'Document', { uploaderId: user.id }); // Thêm quyền đọc tài liệu của mình
        can('read', 'File', { uploaderId: user.id }); // Thêm quyền đọc file của mình
        can('create', 'Comment');
        can('update', 'Comment', { userId: user.id });
        can('delete', 'Comment', { userId: user.id });
        can('create', 'Rating');
        can('update', 'Rating', { userId: user.id });
        can('create', 'Bookmark');
        can('delete', 'Bookmark', { userId: user.id });
        can('download', 'Document', { isPublic: true, isApproved: true });
        can('download', 'Document', { uploaderId: user.id }); // Thêm quyền download tài liệu của mình
        break;
    }

    return build();
  }

  // Helper method to check if user can perform action on subject
  can(user: any, action: Actions, subject: Subjects, conditions?: Record<string, any>): boolean {
    const ability = this.createForUser(user);
    return ability.can(action, subject, conditions as any);
  }

  // Helper method to get user's abilities
  getAbilities(user: any): AppAbility {
    return this.createForUser(user);
  }
}
