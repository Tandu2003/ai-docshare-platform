/**
 * Preview Module - Centralized exports
 *
 * This module handles document preview generation and secure document access.
 */

// ============================================================================
// Services
// ============================================================================
export { PreviewService } from './preview.service';
export { PreviewInitializationService } from './preview-initialization.service';
export { SecureDocumentService } from './secure-document.service';

// Domain-specific preview services
export {
  PreviewUtilService,
  PdfPreviewService,
  OfficePreviewService,
  ImagePreviewService,
  TextPreviewService,
} from './services';

// ============================================================================
// Controllers
// ============================================================================
export { PreviewController } from './controllers/preview.controller';
export { SecureDocumentController } from './controllers/secure-document.controller';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  PreviewImage,
  PreviewMetadata,
  PreviewGenerationResult,
  PreviewGenerationOptions,
  PreviewSize,
  SourceType,
  FileInfo,
  PreviewStatusResult,
  PreviewImageResult,
  PreviewStreamResult,
} from './interfaces';

export {
  PREVIEW_SIZES,
  MAX_PREVIEW_PAGES,
  PREVIEW_QUALITY,
  SHORT_SIGNED_URL_EXPIRY,
  OFFICE_FORMATS,
  TEXT_FORMATS,
} from './interfaces';

// ============================================================================
// Module
// ============================================================================
export { PreviewModule } from './preview.module';
