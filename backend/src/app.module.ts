import { AuthModule } from '@/auth/auth.module';
import { DatabaseInitService, GlobalExceptionFilter } from '@/common';
import { CaslModule } from '@/common/casl';
import { ConfigModule } from '@/config/config.module';
// import { DocumentModule } from '@/document/document.module';
import { AIModule } from '@/ai/ai.module';
import { DocumentsModule } from '@/documents/documents.module';
import { FilesModule } from '@/files/files.module';
import { HealthModule } from '@/health/health.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { BookmarksModule } from '@/bookmarks/bookmarks.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { CategoriesModule } from '@/categories/categories.module';
// import { UploadModule } from '@/upload/upload.module';
import { JwtAuthGuard } from '@/auth/guards';
import { CaslGuard } from '@/common/casl';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    CaslModule,
    AIModule,
    // UploadModule,
    // DocumentModule,
    FilesModule,
    DocumentsModule,
    BookmarksModule,
    CategoriesModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [
    // Global Exception Filter as provider
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global JWT Guard must run BEFORE CASL so request.user is set
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global CASL Guard as provider
    {
      provide: APP_GUARD,
      useClass: CaslGuard,
    },
    // Database initialization service
    DatabaseInitService,
  ],
})
export class AppModule {}
