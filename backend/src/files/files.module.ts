import { CaslModule } from '../common/casl/casl.module';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { NotificationsModule } from '@/notifications/notifications.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, CaslModule, NotificationsModule],
  controllers: [FilesController],
  providers: [FilesService, CloudflareR2Service],
  exports: [FilesService, CloudflareR2Service],
})
export class FilesModule {}
