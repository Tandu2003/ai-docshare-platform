import {
  AdminDocumentsController,
  DocumentAccessController,
  DocumentCommentsController,
  DocumentDownloadController,
  DocumentManagementController,
  DocumentSharingController,
} from './controllers';
import { DocumentsService } from './documents.service';
import {
  DocumentCommentService,
  DocumentCrudService,
  DocumentDownloadService,
  DocumentEmbeddingMaintenanceService,
  DocumentModerationService,
  DocumentQueryService,
  DocumentSearchService,
  DocumentSharingService,
} from './services';
import { AIModule } from '@/ai/ai.module';
import { OptionalJwtAuthGuard } from '@/auth/guards/optional-jwt-auth.guard';
import { CategoriesModule } from '@/categories/categories.module';
import { CloudflareR2Service } from '@/common/cloudflare-r2.service';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { EmbeddingTextBuilderService } from '@/common/services/embedding-text-builder.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { FilesModule } from '@/files/files.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PointsModule } from '@/points/points.module';
import { PreviewModule } from '@/preview/preview.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { SimilarityModule } from '@/similarity/similarity.module';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    FilesModule,
    AIModule,
    NotificationsModule,
    SimilarityModule,
    PointsModule,
    CategoriesModule,
    forwardRef(() => PreviewModule),
  ],
  controllers: [
    AdminDocumentsController,
    DocumentAccessController,
    DocumentCommentsController,
    DocumentDownloadController,
    DocumentManagementController,
    DocumentSharingController,
  ],
  providers: [
    // Main service (facade)
    DocumentsService,
    // Domain-specific services
    DocumentCommentService,
    DocumentCrudService,
    DocumentDownloadService,
    DocumentEmbeddingMaintenanceService,
    DocumentModerationService,
    DocumentQueryService,
    DocumentSearchService,
    DocumentSharingService,
    // Shared services
    CloudflareR2Service,
    SystemSettingsService,
    EmbeddingTextBuilderService,
    EmbeddingStorageService,
    OptionalJwtAuthGuard,
  ],
  exports: [
    DocumentsService,
    DocumentCommentService,
    DocumentCrudService,
    DocumentDownloadService,
    DocumentEmbeddingMaintenanceService,
    DocumentModerationService,
    DocumentQueryService,
    DocumentSearchService,
    DocumentSharingService,
  ],
})
export class DocumentsModule {}
