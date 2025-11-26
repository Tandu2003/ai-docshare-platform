// import { DocumentModule } from '@/document/document.module';
import { AdminModule } from '@/admin/admin.module';
import { AIModule } from '@/ai/ai.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { AuthModule } from '@/auth/auth.module';
// import { UploadModule } from '@/upload/upload.module';
import { JwtAuthGuard } from '@/auth/guards';
import { BookmarksModule } from '@/bookmarks/bookmarks.module';
import { CategoriesModule } from '@/categories/categories.module';
import { DatabaseInitService, GlobalExceptionFilter } from '@/common';
import { AuthorizationModule } from '@/common/authorization';
import { SystemSettingsService } from '@/common/system-settings.service';
import { ConfigModule } from '@/config/config.module';
import { DocumentsModule } from '@/documents/documents.module';
import { FilesModule } from '@/files/files.module';
import { HealthModule } from '@/health/health.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PointsModule } from '@/points/points.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { SimilarityModule } from '@/similarity/similarity.module';
import { UsersModule } from '@/users/users.module';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    AuthorizationModule,
    AIModule,
    // UploadModule,
    // DocumentModule,
    FilesModule,
    DocumentsModule,
    BookmarksModule,
    CategoriesModule,
    AnalyticsModule,
    UsersModule,
    NotificationsModule,
    AdminModule,
    SimilarityModule,
    PointsModule,
  ],
  controllers: [],
  providers: [
    // Global Exception Filter as provider
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global JWT Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Database initialization service
    DatabaseInitService,
    // System settings service
    SystemSettingsService,
  ],
})
export class AppModule {}
