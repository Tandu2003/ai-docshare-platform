import { AIModule } from '../ai/ai.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CaslModule } from '../common/casl/casl.module';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminDocumentsController } from './admin-documents.controller';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { NotificationsModule } from '@/notifications/notifications.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    FilesModule,
    CaslModule,
    AIModule,
    NotificationsModule,
  ],
  controllers: [DocumentsController, AdminDocumentsController],
  providers: [
    DocumentsService,
    CloudflareR2Service,
    SystemSettingsService,
    OptionalJwtAuthGuard,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
