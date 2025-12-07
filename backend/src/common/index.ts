export {
  HTTP_STATUS,
  HTTP_MESSAGES,
  // Search & Similarity constants
  HYBRID_SEARCH_WEIGHTS,
  SEARCH_THRESHOLDS,
  KEYWORD_SCORE_WEIGHTS,
  SIMILARITY_SCORE_WEIGHTS,
  SIMILARITY_THRESHOLDS,
  EMBEDDING_TEXT_LIMITS,
  SEARCH_CACHE_CONFIG,
  EMBEDDING_CACHE_CONFIG,
  SEARCH_LIMITS,
} from './constants';
// Errors - Domain-specific error classes
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

export type { ApiResponse, PaginationMeta, BaseMeta } from './interfaces';

// Utils
export {
  ErrorUtils,
  LoggerUtils,
  AppLogger,
  // Math utilities
  cosineSimilarity,
  normalizeVector,
  euclideanDistance,
  cosineDistanceToSimilarity,
  isValidVector,
} from './utils';

// Filters
export { GlobalExceptionFilter } from './filters';

// Helpers
export { ResponseHelper, HttpErrorHelper } from './helpers';

// Interceptors
export {
  FastifyFileInterceptor,
  FastifyFilesInterceptor,
} from './interceptors';
export type { MultipartFile } from './interceptors';

// Services
export { DatabaseInitService, EmbeddingTextBuilderService } from './services';
export type {
  DocumentForEmbedding,
  DocumentWithContentForEmbedding,
  EmbeddingTextOptions,
} from './services';
export { SystemSettingsService } from './system-settings.service';
export type { SystemSettingValue } from './system-settings.service';

// External Services
export { CloudflareR2Service } from './cloudflare-r2.service';
