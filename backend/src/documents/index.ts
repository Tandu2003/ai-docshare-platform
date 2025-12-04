/**
 * Documents Module - Centralized exports
 *
 * This module handles all document-related operations including:
 * - CRUD operations
 * - Comments and ratings
 * - Share links
 * - Downloads
 * - Moderation
 * - Search
 */

// ============================================================================
// Services
// ============================================================================
export { DocumentsService } from './documents.service';

// Domain-specific services
export {
  DocumentCommentService,
  DocumentCrudService,
  DocumentDownloadService,
  DocumentModerationService,
  DocumentSearchService,
  DocumentSharingService,
} from './services';

// ============================================================================
// Controllers
// ============================================================================
export {
  AdminDocumentsController,
  DocumentAccessController,
  DocumentCommentsController,
  DocumentDownloadController,
  DocumentManagementController,
  DocumentSharingController,
} from './controllers';

// ============================================================================
// Module
// ============================================================================
export { DocumentsModule } from './documents.module';

// ============================================================================
// DTOs
// ============================================================================
export {
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateCommentDto,
  UpdateCommentDto,
  SetRatingDto,
  ShareDocumentDto,
  DownloadDocumentDto,
  ViewDocumentDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  ModerationQueueQueryDto,
} from './dto';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  DocumentWithRelations,
  DocumentCounts,
  CreateDocumentResult,
  CategorySuggestion,
  CategorySuggestionItem,
  CommentWithUser,
  AddCommentPayload,
  EditCommentPayload,
  DownloadPrepareResult,
  DownloadTrackingInfo,
  InitDownloadResult,
  ConfirmDownloadResult,
  ShareLinkOptions,
  ShareLinkValidationResult,
  ModerationQueueOptions,
  ModerationAnalysisResult,
  SimilarDocument,
  AutoModerationResult,
  DocumentSearchOptions,
  DocumentSearchResult,
  PaginationMeta,
  UserRatingResponse,
  SetRatingResult,
  ViewDocumentOptions,
  ViewTrackingResult,
} from './interfaces';

// ============================================================================
// Constants
// ============================================================================
export {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DOWNLOAD_LINK_EXPIRY_HOURS,
  MAX_DOWNLOAD_RETRIES,
  DOWNLOAD_CHUNK_SIZE,
  DEFAULT_SHARE_LINK_EXPIRY_DAYS,
  MAX_SHARE_LINK_EXPIRY_DAYS,
  SHARE_LINK_TOKEN_LENGTH,
  MODERATION_THRESHOLDS,
  MODERATION_STATUSES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_DOCUMENT,
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_COMMENT_DEPTH,
  SEARCH_DEFAULTS,
  DOCUMENT_ERROR_MESSAGES,
  DOCUMENT_SUCCESS_MESSAGES,
} from './constants';
export type { ModerationStatus, AllowedFileType } from './constants';
