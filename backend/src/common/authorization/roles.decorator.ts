import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Convenience decorators
export const AdminOnly = () => Roles('admin');
export const UserOnly = () => Roles('user');
export const AdminOrUser = () => Roles('admin', 'user');
