import { PrismaModule } from '../prisma/prisma.module';
import { AdminCommentController } from './controllers/admin-comment.controller';
import { AdminShareLinkController } from './controllers/admin-share-link.controller';
import { SystemSettingsController } from './controllers/system-settings.controller';
import { AdminCommentService } from './services/admin-comment.service';
import { AdminShareLinkService } from './services/admin-share-link.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    SystemSettingsController,
    AdminCommentController,
    AdminShareLinkController,
  ],
  providers: [
    SystemSettingsService,
    AdminCommentService,
    AdminShareLinkService,
  ],
  exports: [SystemSettingsService, AdminCommentService, AdminShareLinkService],
})
export class AdminModule {}
