import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoleService } from '@/auth/role.service';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService
  ) {}

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
    // Delegate to RoleService to seed structured Permission[] for CASL
    await this.roleService.initializeDefaultRoles();
  }
}
