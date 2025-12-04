/**
 * Notifications Module - Interfaces and Types
 */

// ============================================================================
// Event Interfaces
// ============================================================================

/**
 * View event
 */
export interface ViewEvent {
  readonly type: 'view';
  readonly documentId: string;
  readonly fileId?: string;
  readonly userId?: string;
  readonly count?: number;
}

/**
 * Download event
 */
export interface DownloadEvent {
  readonly type: 'download';
  readonly documentId: string;
  readonly userId?: string;
  readonly count?: number;
}

/**
 * Moderation event
 */
export interface ModerationEvent {
  readonly type: 'moderation';
  readonly documentId: string;
  readonly status: 'approved' | 'rejected';
  readonly notes?: string | null;
  readonly reason?: string | null;
}

/**
 * Comment event
 */
export interface CommentEvent {
  readonly type: 'comment';
  readonly documentId: string;
  readonly documentTitle: string;
  readonly commentId: string;
  readonly commenterName: string;
  readonly commenterId: string;
  readonly content: string;
  readonly isReply?: boolean;
}

/**
 * Reply event
 */
export interface ReplyEvent {
  readonly type: 'reply';
  readonly documentId: string;
  readonly documentTitle: string;
  readonly commentId: string;
  readonly parentCommentId: string;
  readonly replierName: string;
  readonly replierId: string;
  readonly content: string;
}

/**
 * Comment like event
 */
export interface CommentLikeEvent {
  readonly type: 'comment_like';
  readonly documentId: string;
  readonly documentTitle: string;
  readonly commentId: string;
  readonly likerName: string;
  readonly likerId: string;
}

// ============================================================================
// Realtime Document Events
// ============================================================================

/**
 * New comment event for realtime
 */
export interface NewCommentEvent {
  readonly type: 'new_comment';
  readonly documentId: string;
  readonly comment: unknown;
}

/**
 * Comment updated event for realtime
 */
export interface CommentUpdatedEvent {
  readonly type: 'comment_updated';
  readonly documentId: string;
  readonly commentId: string;
  readonly likesCount: number;
  readonly isLiked?: boolean;
  readonly likerId?: string;
}

/**
 * Comment deleted event for realtime
 */
export interface CommentDeletedEvent {
  readonly type: 'comment_deleted';
  readonly documentId: string;
  readonly commentId: string;
}

// ============================================================================
// Union Types
// ============================================================================

export type NotificationEvent =
  | ViewEvent
  | DownloadEvent
  | ModerationEvent
  | CommentEvent
  | ReplyEvent
  | CommentLikeEvent;

export type DocumentRealtimeEvent =
  | NewCommentEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent;

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'view'
  | 'download'
  | 'moderation'
  | 'comment'
  | 'reply'
  | 'comment_like';
