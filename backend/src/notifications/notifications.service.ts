import { NotificationsGateway } from './notifications.gateway';
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

  constructor(private readonly gateway: NotificationsGateway) {}

  emit(event: NotificationEvent): void {
    try {
      this.gateway.server.emit('notification', event);
    } catch (err) {
      this.logger.error('Failed to emit notification', err as any);
    }
  }

  emitToUser(userId: string, event: NotificationEvent): void {
    try {
      this.gateway.server.to(`user:${userId}`).emit('notification', event);
    } catch (err) {
      this.logger.error('Failed to emit notification to user', err as any);
    }
  }

  emitToUploaderOfDocument(uploaderId: string, event: NotificationEvent): void {
    this.emitToUser(uploaderId, event);
  }
}
