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

type NotificationEvent = ViewEvent | DownloadEvent | ModerationEvent;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  emit(event: NotificationEvent): void {
    try {
      this.gateway.server.emit('notification', event);
    } catch (err) {
      this.logger.error('Failed to emit notification', err);
    }
  }

  async emitToUser(userId: string, event: NotificationEvent): Promise<void> {
    try {
      // Lưu notification vào database
      await this.saveNotificationToDatabase(userId, event);

      // Gửi qua WebSocket
      this.gateway.server.to(`user:${userId}`).emit('notification', event);
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
