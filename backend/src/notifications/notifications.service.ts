import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

export interface ViewEvent {
  type: 'view';
  documentId: string;
  fileId?: string;
  userId?: string;
  count?: number;
}
export interface DownloadEvent {
  type: 'download';
  documentId: string;
  userId?: string;
  count?: number;
}
export interface ModerationEvent {
  type: 'moderation';
  documentId: string;
  status: 'approved' | 'rejected';
  notes?: string | null;
  reason?: string | null;
}

export interface CommentEvent {
  type: 'comment';
  documentId: string;
  documentTitle: string;
  commentId: string;
  commenterName: string;
  commenterId: string;
  content: string;
  isReply?: boolean;
}

export interface ReplyEvent {
  type: 'reply';
  documentId: string;
  documentTitle: string;
  commentId: string;
  parentCommentId: string;
  replierName: string;
  replierId: string;
  content: string;
}

export interface CommentLikeEvent {
  type: 'comment_like';
  documentId: string;
  documentTitle: string;
  commentId: string;
  likerName: string;
  likerId: string;
}

// Document realtime events (broadcast to all viewers)
export interface NewCommentEvent {
  type: 'new_comment';
  documentId: string;
  comment: any; // Full comment object
}

export interface CommentUpdatedEvent {
  type: 'comment_updated';
  documentId: string;
  commentId: string;
  likesCount: number;
  isLiked?: boolean;
  likerId?: string;
}

export interface CommentDeletedEvent {
  type: 'comment_deleted';
  documentId: string;
  commentId: string;
}

type NotificationEvent =
  | ViewEvent
  | DownloadEvent
  | ModerationEvent
  | CommentEvent
  | ReplyEvent
  | CommentLikeEvent;

type DocumentRealtimeEvent =
  | NewCommentEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  emit(event: NotificationEvent): void {
    try {
      const sockets = this.gateway.server?.sockets;
      this.logger.log(
        `Broadcasting notification to all clients. Connected clients: ${sockets?.sockets?.size ?? 0}`,
      );
      this.gateway.server?.emit('notification', event);
      this.logger.log(`Notification broadcasted: ${JSON.stringify(event)}`);
    } catch (err) {
      this.logger.error('Failed to emit notification', err);
    }
  }

  emitToDocument(documentId: string, event: DocumentRealtimeEvent): void {
    try {
      const room = `document:${documentId}`;
      const socketsInRoom =
        this.gateway.server?.sockets?.adapter?.rooms?.get(room);
      const socketCount = socketsInRoom?.size ?? 0;

      this.logger.log(
        `Emitting document event to room ${room}. Sockets in room: ${socketCount}`,
      );

      this.gateway.server?.to(room).emit('document:update', event);

      this.logger.log(
        `Document event sent to ${room}: ${JSON.stringify(event)}`,
      );
    } catch (err) {
      this.logger.error('Failed to emit document event', err);
    }
  }

  async emitToUser(userId: string, event: NotificationEvent): Promise<void> {
    try {
      // Lưu notification vào database
      await this.saveNotificationToDatabase(userId, event);

      // Check how many sockets are in the user's room
      const room = `user:${userId}`;
      const socketsInRoom =
        this.gateway.server?.sockets?.adapter?.rooms?.get(room);
      const socketCount = socketsInRoom?.size ?? 0;

      this.logger.log(
        `Emitting notification to room ${room}. Sockets in room: ${socketCount}`,
      );

      // Gửi qua WebSocket
      this.gateway.server?.to(room).emit('notification', event);

      this.logger.log(
        `Notification sent to user ${userId}: ${JSON.stringify(event)}`,
      );
    } catch (err) {
      this.logger.error('Failed to emit notification to user', err);
    }
  }

  async emitToUploaderOfDocument(
    uploaderId: string,
    event: NotificationEvent,
  ): Promise<void> {
    await this.emitToUser(uploaderId, event);
  }

  private async saveNotificationToDatabase(
    userId: string,
    event: NotificationEvent,
  ): Promise<void> {
    try {
      let title = '';
      let message = '';

      switch (event.type) {
        case 'moderation':
          if (event.status === 'approved') {
            title = 'Tài liệu đã được duyệt';
            message = 'Tài liệu của bạn đã được duyệt và công khai.';
          } else {
            title = 'Tài liệu bị từ chối';
            message = 'Tài liệu của bạn đã bị từ chối kiểm duyệt.';
          }
          break;
        case 'view':
          title = 'Lượt xem mới';
          message = 'Tài liệu vừa có lượt xem mới.';
          break;
        case 'download':
          title = 'Lượt tải xuống mới';
          message = 'Tài liệu vừa có lượt tải xuống mới.';
          break;
        case 'comment':
          title = 'Bình luận mới';
          message = `${event.commenterName} đã bình luận trên tài liệu "${event.documentTitle}"`;
          break;
        case 'reply':
          title = 'Trả lời bình luận';
          message = `${event.replierName} đã trả lời bình luận của bạn trên tài liệu "${event.documentTitle}"`;
          break;
        case 'comment_like':
          title = 'Lượt thích bình luận';
          message = `${event.likerName} đã thích bình luận của bạn trên tài liệu "${event.documentTitle}"`;
          break;
        default:
          title = 'Thông báo hệ thống';
          message = 'Có cập nhật mới.';
      }

      await this.prisma.notification.create({
        data: {
          userId,
          type: event.type,
          title,
          message,
          data: event as any,
        },
      });

      this.logger.log(
        `Notification saved to database for user ${userId}: ${title}`,
      );
    } catch (error) {
      this.logger.error('Failed to save notification to database:', error);
    }
  }
}
