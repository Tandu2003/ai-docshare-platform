/**
 * Files Module - Centralized exports
 */

// ============================================================================
// Services
// ============================================================================
export { FilesService } from './files.service';

// ============================================================================
// Controllers
// ============================================================================
export { FilesController } from './controllers/files.controller';

// ============================================================================
// Module
// ============================================================================
export { FilesModule } from './files.module';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  UploadedFile,
  FileUploadResult,
  FilesUploadResult,
  FileMetadata,
  SecureFileUrlResult,
} from './interfaces';

// ============================================================================
// Constants
// ============================================================================
export {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_UPLOAD,
  ALLOWED_MIME_TYPES,
  STORAGE_PATHS,
  FILE_ERROR_MESSAGES,
  FILE_SUCCESS_MESSAGES,
} from './constants';
export type { AllowedMimeType, StoragePath } from './constants';
