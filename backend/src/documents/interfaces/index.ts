/**
 * Document Module - Interfaces and Types
 *
 * Following TypeScript Coding Standards:
 * - Use `interface` for extendable object shapes
 * - Use `type` for unions, intersections, utility types
 * - PascalCase for interfaces and types
 */

import {
  Category,
  Comment,
  Document,
  DocumentFile,
  Rating,
  User,
} from '@prisma/client';

export type { AuthenticatedRequest } from './authenticated-request.interface';

// ============================================================================
// Document Interfaces
// ============================================================================

/**
 * Document with relations
 */
export interface DocumentWithRelations extends Document {
  readonly uploader: Pick<User, 'id' | 'username' | 'firstName' | 'lastName'>;
  readonly category: Category;
  readonly files?: DocumentFile[];
  readonly ratings?: Rating[];
  readonly _count?: DocumentCounts;
}

/**
 * Document counts for aggregations
 */
export interface DocumentCounts {
  readonly files?: number;
  readonly ratings?: number;
  readonly comments?: number;
  readonly views?: number;
  readonly downloads?: number;
  readonly bookmarks?: number;
}

/**
 * Document creation result
 */
export interface CreateDocumentResult {
  readonly document: DocumentWithRelations;
  readonly suggestedCategory: CategorySuggestion | null;
}

/**
 * Category suggestion from AI
 */
export interface CategorySuggestion {
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly confidence: number;
  readonly allSuggestions: CategorySuggestionItem[];
}

/**
 * Individual category suggestion item
 */
export interface CategorySuggestionItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly color: string | null;
  readonly parentId: string | null;
  readonly score: number;
  readonly confidence: number;
}

// ============================================================================
// Comment Interfaces
// ============================================================================

/**
 * Comment with user info
 */
export interface CommentWithUser extends Comment {
  readonly user: Pick<
    User,
    'id' | 'username' | 'firstName' | 'lastName' | 'avatar'
  >;
  readonly isLiked?: boolean;
  readonly replies?: CommentWithUser[];
}

/**
 * Add comment payload
 */
export interface AddCommentPayload {
  readonly content: string;
  readonly parentId?: string;
}

/**
 * Edit comment payload
 */
export interface EditCommentPayload {
  readonly content: string;
}

// ============================================================================
// Download Interfaces
// ============================================================================

/**
 * Download preparation result
 */
export interface DownloadPrepareResult {
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly expiresAt: Date;
}

/**
 * Download tracking info
 */
export interface DownloadTrackingInfo {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly referrer: string;
  readonly apiKey?: string;
}

/**
 * Init download result
 */
export interface InitDownloadResult {
  readonly downloadId: string;
  readonly pointsCost: number;
  readonly currentPoints: number;
  readonly canAfford: boolean;
  readonly document: {
    readonly id: string;
    readonly title: string;
    readonly fileCount: number;
    readonly totalSize: number;
  };
}

/**
 * Confirm download result
 */
export interface ConfirmDownloadResult {
  readonly downloadId: string;
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly remainingPoints: number;
}

// ============================================================================
// Share Link Interfaces
// ============================================================================

/**
 * Share link options
 */
export interface ShareLinkOptions {
  readonly expiresAt?: Date;
  readonly maxDownloads?: number;
  readonly password?: string;
  readonly allowPreview?: boolean;
}

/**
 * Share link validation result
 */
export interface ShareLinkValidationResult {
  readonly isValid: boolean;
  readonly document?: DocumentWithRelations;
  readonly error?: string;
}

// ============================================================================
// Moderation Interfaces
// ============================================================================

/**
 * Moderation queue options
 */
export interface ModerationQueueOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Moderation analysis result
 */
export interface ModerationAnalysisResult {
  readonly documentId: string;
  readonly moderationScore: number;
  readonly safetyFlags: string[];
  readonly isSafe: boolean;
  readonly recommendedAction: 'approve' | 'review' | 'reject';
  readonly similarDocuments?: SimilarDocument[];
}

/**
 * Similar document for moderation
 */
export interface SimilarDocument {
  readonly documentId: string;
  readonly title: string;
  readonly similarity: number;
}

/**
 * Auto moderation result
 */
export interface AutoModerationResult {
  readonly action: 'auto_approved' | 'auto_rejected' | 'pending_review';
  readonly reason: string;
  readonly confidence: number;
  readonly details?: Record<string, unknown>;
}

// ============================================================================
// Search Interfaces
// ============================================================================

/**
 * Search options
 */
export interface DocumentSearchOptions {
  readonly query: string;
  readonly page?: number;
  readonly limit?: number;
  readonly categoryId?: string;
  readonly tags?: string[];
  readonly language?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly useVectorSearch?: boolean;
}

/**
 * Search result
 */
export interface DocumentSearchResult {
  readonly documents: DocumentWithRelations[];
  readonly pagination: PaginationMeta;
  readonly searchMetrics?: {
    readonly vectorScore?: number;
    readonly textScore?: number;
    readonly totalMatches: number;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

// ============================================================================
// Rating Interfaces
// ============================================================================

/**
 * User rating response
 */
export interface UserRatingResponse {
  readonly rating: number;
}

/**
 * Set rating result
 */
export interface SetRatingResult {
  readonly rating: number;
  readonly averageRating: number;
  readonly ratingCount: number;
}

// ============================================================================
// View Interfaces
// ============================================================================

/**
 * View document options
 */
export interface ViewDocumentOptions {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly referrer?: string;
}

/**
 * View tracking result
 */
export interface ViewTrackingResult {
  readonly viewed: boolean;
  readonly isNewView: boolean;
  readonly totalViews: number;
}
