import { RoleService } from '@/auth/role.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async onModuleInit() {
    this.logger.log('🔄 Đang khởi tạo cơ sở dữ liệu với vai trò mặc định...');

    try {
      await this.initializeRoles();
      this.logger.log('✅ Khởi tạo cơ sở dữ liệu hoàn thành thành công');
    } catch (error) {
      this.logger.error('❌ Khởi tạo cơ sở dữ liệu thất bại:', error);
      throw error;
    }
  }

  private async initializeRoles() {
    // Delegate to RoleService to seed structured Permission[] for CASL
    await this.roleService.initializeDefaultRoles();
  }
}
