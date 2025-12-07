import { useEffect, type ReactElement, type ReactNode } from 'react';

import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { disconnectSocket, getSocket, reconnectSocket } from '@/lib/socket';

interface NotificationEvent {
  type:
    | 'view'
    | 'download'
    | 'moderation'
    | 'comment'
    | 'reply'
    | 'comment_like';
  documentId?: string;
  documentTitle?: string;
  fileId?: string;
  userId?: string;
  count?: number;
  status?: 'approved' | 'rejected';
  notes?: string | null;
  reason?: string | null;
  // Comment specific fields
  commentId?: string;
  commenterName?: string;
  commenterId?: string;
  content?: string;
  isReply?: boolean;
  // Reply specific fields
  parentCommentId?: string;
  replierName?: string;
  replierId?: string;
  // Like specific fields
  likerName?: string;
  likerId?: string;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({
  children,
}: SocketProviderProps): ReactElement {
  const { isAuthenticated, accessToken } = useAuth();

  // Initialize/disconnect socket based on auth state
  // Also handle notification subscriptions in the same effect to ensure proper timing
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      reconnectSocket();

      // Get socket and subscribe to events after reconnect
      const socket = getSocket();

      const handleNotification = (event: NotificationEvent) => {
        const navigateToDocument = (docId?: string) => {
          if (docId) {
            window.location.href = `/documents/${docId}`;
          }
        };

        switch (event?.type) {
          case 'view':
            toast.info('Có lượt xem mới cho tài liệu', {
              action: event.documentId
                ? {
                    label: 'Xem',
                    onClick: () => navigateToDocument(event.documentId),
                  }
                : undefined,
            });
            break;
          case 'download':
            toast.success('Có lượt tải xuống mới cho tài liệu', {
              action: event.documentId
                ? {
                    label: 'Xem',
                    onClick: () => navigateToDocument(event.documentId),
                  }
                : undefined,
            });
            break;
          case 'moderation':
            if (event.status === 'approved') {
              toast.success('Tài liệu của bạn đã được duyệt', {
                action: event.documentId
                  ? {
                      label: 'Xem',
                      onClick: () => navigateToDocument(event.documentId),
                    }
                  : undefined,
              });
            } else {
              toast.error('Tài liệu của bạn đã bị từ chối', {
                description: event.reason || event.notes || undefined,
              });
            }
            break;
          case 'comment':
            toast.info(
              `${event.commenterName} đã bình luận trên tài liệu "${event.documentTitle}"`,
              {
                description: event.content,
                action: event.documentId
                  ? {
                      label: 'Xem',
                      onClick: () => navigateToDocument(event.documentId),
                    }
                  : undefined,
              },
            );
            break;
          case 'reply':
            toast.info(`${event.replierName} đã trả lời bình luận của bạn`, {
              description: event.content,
              action: event.documentId
                ? {
                    label: 'Xem',
                    onClick: () => navigateToDocument(event.documentId),
                  }
                : undefined,
            });
            break;
          case 'comment_like':
            toast.info(`${event.likerName} đã thích bình luận của bạn`, {
              description: `Trên tài liệu "${event.documentTitle}"`,
              action: event.documentId
                ? {
                    label: 'Xem',
                    onClick: () => navigateToDocument(event.documentId),
                  }
                : undefined,
            });
            break;
          default:
        }
      };

      socket.on('notification', handleNotification);

      return () => {
        socket.off('notification', handleNotification);
      };
    } else if (!isAuthenticated) {
      disconnectSocket();
    }
  }, [isAuthenticated, accessToken]);

  return <>{children}</>;
}
