import {
  Category,
  Comment,
  Document,
  DocumentFile,
  Rating,
  User,
} from '@prisma/client';

export type { AuthenticatedRequest } from './authenticated-request.interface';

export interface DocumentWithRelations extends Document {
  readonly uploader: Pick<User, 'id' | 'username' | 'firstName' | 'lastName'>;
  readonly category: Category;
  readonly files?: DocumentFile[];
  readonly ratings?: Rating[];
  readonly _count?: DocumentCounts;
}

export interface DocumentCounts {
  readonly files?: number;
  readonly ratings?: number;
  readonly comments?: number;
  readonly views?: number;
  readonly downloads?: number;
  readonly bookmarks?: number;
}

export interface CreateDocumentResult {
  readonly document: DocumentWithRelations;
  readonly suggestedCategory: CategorySuggestion | null;
}

export interface CategorySuggestion {
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly confidence: number;
  readonly allSuggestions: CategorySuggestionItem[];
}

export interface CategorySuggestionItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly color: string | null;
  readonly parentId: string | null;
  readonly score: number;
  readonly confidence: number;
}

export interface CommentWithUser extends Comment {
  readonly user: Pick<
    User,
    'id' | 'username' | 'firstName' | 'lastName' | 'avatar'
  >;
  readonly isLiked?: boolean;
  readonly replies?: CommentWithUser[];
}

export interface AddCommentPayload {
  readonly content: string;
  readonly parentId?: string;
}

export interface EditCommentPayload {
  readonly content: string;
}

export interface DownloadPrepareResult {
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly expiresAt: Date;
}

export interface DownloadTrackingInfo {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly referrer: string;
  readonly apiKey?: string;
}

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

export interface ConfirmDownloadResult {
  readonly downloadId: string;
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly remainingPoints: number;
}

export interface ShareLinkOptions {
  readonly expiresAt?: Date;
  readonly maxDownloads?: number;
  readonly password?: string;
  readonly allowPreview?: boolean;
}

export interface ShareLinkValidationResult {
  readonly isValid: boolean;
  readonly document?: DocumentWithRelations;
  readonly error?: string;
}

export interface ModerationQueueOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly status?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface ModerationAnalysisResult {
  readonly documentId: string;
  readonly moderationScore: number;
  readonly safetyFlags: string[];
  readonly isSafe: boolean;
  readonly recommendedAction: 'approve' | 'review' | 'reject';
  readonly similarDocuments?: SimilarDocument[];
}

export interface SimilarDocument {
  readonly documentId: string;
  readonly title: string;
  readonly similarity: number;
}

export interface AutoModerationResult {
  readonly action: 'auto_approved' | 'auto_rejected' | 'pending_review';
  readonly reason: string;
  readonly confidence: number;
  readonly details?: Record<string, unknown>;
}

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

export interface DocumentSearchResult {
  readonly documents: DocumentWithRelations[];
  readonly pagination: PaginationMeta;
  readonly searchMetrics?: {
    readonly vectorScore?: number;
    readonly textScore?: number;
    readonly totalMatches: number;
  };
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

export interface UserRatingResponse {
  readonly rating: number;
}

export interface SetRatingResult {
  readonly rating: number;
  readonly averageRating: number;
  readonly ratingCount: number;
}

export interface ViewDocumentOptions {
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly referrer?: string;
}

export interface ViewTrackingResult {
  readonly viewed: boolean;
  readonly isNewView: boolean;
  readonly totalViews: number;
}
