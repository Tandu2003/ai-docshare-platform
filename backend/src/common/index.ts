/**
 * Common Module - Centralized exports for shared utilities, helpers, and services
 *
 * This module follows the Single Source of Truth principle (Commandment #6)
 * by centralizing all common exports in one place.
 */

// ============================================================================
// Constants
// ============================================================================
export { HTTP_STATUS, HTTP_MESSAGES } from './constants';

// ============================================================================
// Errors - Domain-specific error classes
// ============================================================================
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
} from './errors';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type { ApiResponse, PaginationMeta, BaseMeta } from './interfaces';

// ============================================================================
// Utils
// ============================================================================
export { ErrorUtils } from './utils';

// ============================================================================
// Filters
// ============================================================================
export { GlobalExceptionFilter } from './filters';

// ============================================================================
// Helpers
// ============================================================================
export { ResponseHelper, HttpErrorHelper } from './helpers';

// ============================================================================
// Interceptors
// ============================================================================
export {
  FastifyFileInterceptor,
  FastifyFilesInterceptor,
} from './interceptors';
export type { MultipartFile } from './interceptors';

// ============================================================================
// Services
// ============================================================================
export { DatabaseInitService } from './services';
export { SystemSettingsService } from './system-settings.service';
export type { SystemSettingValue } from './system-settings.service';

// ============================================================================
// External Services
// ============================================================================
export { CloudflareR2Service } from './cloudflare-r2.service';
