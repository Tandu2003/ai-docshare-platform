import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('🔄 Initializing database with default roles...');

    try {
      await this.initializeRoles();
      this.logger.log('✅ Database initialization completed successfully');
    } catch (error) {
      this.logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async initializeRoles() {
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissions: [
          'users:read',
          'users:write',
          'users:delete',
          'documents:read',
          'documents:write',
          'documents:delete',
          'documents:moderate',
          'roles:manage',
          'system:manage',
        ],
      },
      {
        name: 'moderator',
        description: 'Moderator with document management access',
        permissions: ['documents:read', 'documents:write', 'documents:moderate', 'users:read'],
      },
      {
        name: 'user',
        description: 'Regular user with basic access',
        permissions: ['documents:read', 'documents:write', 'profile:manage'],
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        await this.prisma.role.create({
          data: {
            name: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions,
          },
        });
        this.logger.log(`✅ Created default role: ${roleData.name}`);
      } else {
        this.logger.debug(`⚠️ Role already exists: ${roleData.name}`);
      }
    }
  }
}
