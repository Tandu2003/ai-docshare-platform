import { AuthModule } from '@/auth/auth.module';
import { DatabaseInitService, GlobalExceptionFilter } from '@/common';
import { ConfigModule } from '@/config/config.module';
import { DocumentModule } from '@/document/document.module';
import { HealthModule } from '@/health/health.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UploadModule } from '@/upload/upload.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule, UploadModule, DocumentModule],
  controllers: [],
  providers: [
    // Global Exception Filter as provider
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Database initialization service
    DatabaseInitService,
  ],
})
export class AppModule {}
