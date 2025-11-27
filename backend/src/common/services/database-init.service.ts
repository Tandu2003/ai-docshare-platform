import { RoleService } from '@/auth/role.service';
import { CategoriesService } from '@/categories/categories.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async onModuleInit() {
    this.logger.log('🔄 Đang khởi tạo cơ sở dữ liệu...');

    try {
      await this.initializeRoles();
      await this.initializeCategories();
      this.logger.log('✅ Khởi tạo cơ sở dữ liệu hoàn thành thành công');
    } catch (error) {
      this.logger.error('❌ Khởi tạo cơ sở dữ liệu thất bại:', error);
      throw error;
    }
  }

  private async initializeRoles() {
    this.logger.log('🔄 Khởi tạo vai trò mặc định...');
    await this.roleService.initializeDefaultRoles();
    this.logger.log('✅ Khởi tạo vai trò mặc định hoàn thành');
  }

  private async initializeCategories() {
    this.logger.log('🔄 Khởi tạo danh mục mặc định...');
    await this.categoriesService.initializeDefaultCategories();
    this.logger.log('✅ Khởi tạo danh mục mặc định hoàn thành');
  }
}
