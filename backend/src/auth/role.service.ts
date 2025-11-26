import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface Permission {
  action: string;
  subject: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
}

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async createRole(
    name: string,
    description: string,
    permissions: Permission[],
  ): Promise<any> {
    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions as any,
      },
    });
  }

  async updateRolePermissions(
    roleId: string,
    permissions: Permission[],
  ): Promise<any> {
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: permissions as any,
      },
    });
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    return (role?.permissions as unknown as Permission[]) || [];
  }

  async getAllRoles(): Promise<any[]> {
    return this.prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<any> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: {
        role: true,
      },
    });
  }

  async getUserRole(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    return user?.role;
  }

  // Predefined role templates
  getDefaultRoles(): RolePermissions[] {
    return [
      {
        role: 'admin',
        permissions: [{ action: 'manage', subject: 'all' }],
      },
      {
        role: 'user',
        permissions: [
          // Documents
          {
            action: 'read',
            subject: 'Document',
            conditions: { isPublic: true, isApproved: true },
          },
          {
            action: 'read',
            subject: 'Document',
            conditions: { uploaderId: '$user.id' },
          },
          { action: 'create', subject: 'Document' },
          {
            action: 'update',
            subject: 'Document',
            conditions: { uploaderId: '$user.id' },
          },
          {
            action: 'delete',
            subject: 'Document',
            conditions: { uploaderId: '$user.id' },
          },
          // Files
          { action: 'upload', subject: 'File' },
          // Comments
          { action: 'create', subject: 'Comment' },
          {
            action: 'update',
            subject: 'Comment',
            conditions: { userId: '$user.id' },
          },
          {
            action: 'delete',
            subject: 'Comment',
            conditions: { userId: '$user.id' },
          },
          // Ratings
          { action: 'create', subject: 'Rating' },
          {
            action: 'update',
            subject: 'Rating',
            conditions: { userId: '$user.id' },
          },
          // Bookmarks
          { action: 'create', subject: 'Bookmark' },
          {
            action: 'read',
            subject: 'Bookmark',
            conditions: { userId: '$user.id' },
          },
          {
            action: 'delete',
            subject: 'Bookmark',
            conditions: { userId: '$user.id' },
          },
          // Download
          {
            action: 'download',
            subject: 'Document',
            conditions: { isPublic: true, isApproved: true },
          },
          {
            action: 'download',
            subject: 'Document',
            conditions: { uploaderId: '$user.id' },
          },
        ],
      },
    ];
  }

  async initializeDefaultRoles(): Promise<void> {
    const defaultRoles = this.getDefaultRoles();

    for (const roleData of defaultRoles) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: roleData.role },
      });

      if (!existingRole) {
        await this.createRole(
          roleData.role,
          `Default ${roleData.role} role`,
          roleData.permissions,
        );
      } else {
        // Update existing role with default permissions if needed
        await this.updateRolePermissions(existingRole.id, roleData.permissions);
        // Ensure role is active
        if (existingRole.isActive === false) {
          await this.prisma.role.update({
            where: { id: existingRole.id },
            data: { isActive: true },
          });
        }
      }
    }

    // Deactivate any roles that are not in the default set
    const allowedNames = defaultRoles.map(r => r.role);
    await this.prisma.role.updateMany({
      where: { name: { notIn: allowedNames } },
      data: { isActive: false },
    });
  }
}
