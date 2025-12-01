import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewInitializationService } from './preview-initialization.service';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';
import { SecureDocumentController } from './secure-document.controller';
import { SecureDocumentService } from './secure-document.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PreviewController, SecureDocumentController],
  providers: [
    PreviewService,
    SecureDocumentService,
    CloudflareR2Service,
    CloudinaryService,
    PreviewInitializationService,
  ],
  exports: [
    PreviewService,
    SecureDocumentService,
    PreviewInitializationService,
  ],
})
export class PreviewModule {}
