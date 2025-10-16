import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CaslModule } from '../common/casl/casl.module';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, FilesModule, CaslModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, CloudflareR2Service, OptionalJwtAuthGuard],
  exports: [DocumentsService],
})
export class DocumentsModule {}
