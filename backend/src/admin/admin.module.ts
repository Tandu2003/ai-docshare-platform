import { PrismaModule } from '../prisma/prisma.module';
import { AdminCommentController } from './controllers/admin-comment.controller';
import { SystemSettingsController } from './controllers/system-settings.controller';
import { AdminCommentService } from './services/admin-comment.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [SystemSettingsController, AdminCommentController],
  providers: [SystemSettingsService, AdminCommentService],
  exports: [SystemSettingsService, AdminCommentService],
})
export class AdminModule {}
