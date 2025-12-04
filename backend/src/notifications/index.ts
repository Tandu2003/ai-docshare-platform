/**
 * Notifications Module - Centralized exports
 */

// ============================================================================
// Services
// ============================================================================
export { NotificationsService } from './notifications.service';

// ============================================================================
// Gateways
// ============================================================================
export { NotificationsGateway } from './notifications.gateway';

// ============================================================================
// Controllers
// ============================================================================
export { NotificationsController } from './controllers/notifications.controller';

// ============================================================================
// Module
// ============================================================================
export { NotificationsModule } from './notifications.module';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  ViewEvent,
  DownloadEvent,
  ModerationEvent,
  CommentEvent,
  ReplyEvent,
  CommentLikeEvent,
  NewCommentEvent,
  CommentUpdatedEvent,
  CommentDeletedEvent,
  NotificationEvent,
  DocumentRealtimeEvent,
  NotificationType,
} from './interfaces';
