import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [PrismaModule, ConfigModule, FilesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, CloudflareR2Service],
  exports: [DocumentsService],
})
export class DocumentsModule {}
