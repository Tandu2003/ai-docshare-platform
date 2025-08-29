import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Permission, RolePermissions } from '@/common/casl';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async createRole(name: string, description: string, permissions: Permission[]): Promise<any> {
    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions as any,
      },
    });
  }

  async updateRolePermissions(roleId: string, permissions: Permission[]): Promise<any> {
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
        role: 'moderator',
        permissions: [
          { action: 'read', subject: 'all' },
          { action: 'update', subject: 'Document' },
          { action: 'approve', subject: 'Document' },
          { action: 'moderate', subject: 'Comment' },
          { action: 'moderate', subject: 'User' },
        ],
      },
      {
        role: 'publisher',
        permissions: [
          { action: 'create', subject: 'Document' },
          { action: 'read', subject: 'Document' },
          { action: 'update', subject: 'Document', conditions: { uploaderId: '$user.id' } },
          { action: 'delete', subject: 'Document', conditions: { uploaderId: '$user.id' } },
          { action: 'upload', subject: 'File' },
          { action: 'read', subject: 'File', conditions: { uploaderId: '$user.id' } },
        ],
      },
      {
        role: 'user',
        permissions: [
          { action: 'read', subject: 'Document', conditions: { isPublic: true, isApproved: true } },
          { action: 'create', subject: 'Comment' },
          { action: 'update', subject: 'Comment', conditions: { userId: '$user.id' } },
          { action: 'delete', subject: 'Comment', conditions: { userId: '$user.id' } },
          { action: 'create', subject: 'Rating' },
          { action: 'update', subject: 'Rating', conditions: { userId: '$user.id' } },
          { action: 'create', subject: 'Bookmark' },
          { action: 'delete', subject: 'Bookmark', conditions: { userId: '$user.id' } },
          {
            action: 'download',
            subject: 'Document',
            conditions: { isPublic: true, isApproved: true },
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
        await this.createRole(roleData.role, `Default ${roleData.role} role`, roleData.permissions);
      } else {
        // Update existing role with default permissions if needed
        await this.updateRolePermissions(existingRole.id, roleData.permissions);
      }
    }
  }
}
