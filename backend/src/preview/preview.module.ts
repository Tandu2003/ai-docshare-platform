import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PreviewInitializationService } from './preview-initialization.service';
import { PreviewController } from './controllers/preview.controller';
import { PreviewService } from './preview.service';
import { SecureDocumentController } from './controllers/secure-document.controller';
import { SecureDocumentService } from './secure-document.service';
import {
  ImagePreviewService,
  OfficePreviewService,
  PdfPreviewService,
  PreviewUtilService,
  TextPreviewService,
} from './services';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [PreviewController, SecureDocumentController],
  providers: [
    // Core services
    PreviewService,
    SecureDocumentService,
    CloudflareR2Service,
    PreviewInitializationService,
    // Domain-specific preview services
    PreviewUtilService,
    PdfPreviewService,
    OfficePreviewService,
    ImagePreviewService,
    TextPreviewService,
  ],
  exports: [
    PreviewService,
    SecureDocumentService,
    PreviewInitializationService,
    // Export domain services for use in other modules
    PreviewUtilService,
    PdfPreviewService,
  ],
})
export class PreviewModule {}
