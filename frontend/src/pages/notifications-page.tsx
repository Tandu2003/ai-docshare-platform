import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';

import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  ExternalLink,
  Filter,
  Heart,
  MessageCircle,
  Reply,
  Settings,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks';
import { getSocket } from '@/lib/socket';
import {
  deleteNotification,
  deleteNotifications,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications.service';
import type { Notification } from '@/types';

export function NotificationsPage(): ReactElement {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    [],
  );

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = (await getMyNotifications({ page: 1, limit: 50 })) as any;

        // Handle API response structure: {success: true, data: [...], meta: {...}}
        let notificationsData: Notification[] = [];
        if (res && res.data && Array.isArray(res.data)) {
          notificationsData = res.data;
        } else if (Array.isArray(res)) {
          notificationsData = res;
        }

        setNotifications(notificationsData);
      } catch {
        // Silently handle notification loading errors
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Handle realtime notifications
  const handleRealtimeNotification = useCallback((event: any) => {
    const now = new Date();
    let type: Notification['type'] = 'system';
    let title = 'Thông báo hệ thống';
    let message = 'Có cập nhật mới.';

    if (event?.type === 'view') {
      type = 'system';
      title = 'Lượt xem mới';
      message = 'Tài liệu vừa có lượt xem mới.';
    } else if (event?.type === 'download') {
      type = 'system';
      title = 'Lượt tải xuống mới';
      message = 'Tài liệu vừa có lượt tải xuống mới.';
    } else if (event?.type === 'moderation') {
      if (event.status === 'approved') {
        type = 'document_approved';
        title = 'Tài liệu đã được duyệt';
        message = 'Tài liệu của bạn đã được duyệt và công khai.';
      } else {
        type = 'system';
        title = 'Tài liệu bị từ chối';
        message = 'Tài liệu của bạn đã bị từ chối kiểm duyệt.';
      }
    } else if (event?.type === 'comment') {
      type = 'comment';
      title = 'Bình luận mới';
      message = `${event.commenterName} đã bình luận trên tài liệu "${event.documentTitle}"`;
    } else if (event?.type === 'reply') {
      type = 'comment';
      title = 'Trả lời bình luận';
      message = `${event.replierName} đã trả lời bình luận của bạn`;
    } else if (event?.type === 'comment_like') {
      type = 'comment';
      title = 'Thích bình luận';
      message = `${event.likerName} đã thích bình luận của bạn`;
    }

    const newNotif: Notification = {
      id: crypto.randomUUID(),
      userId: 'me',
      type,
      title,
      message,
      data: event || {},
      isRead: false,
      createdAt: now,
      user: {
        id: 'me',
        email: '',
        username: 'me',
        password: '',
        firstName: '',
        lastName: '',
        roleId: 'user',
        pointsBalance: 0,
        isVerified: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        role: {
          id: 'user',
          name: 'User',
          description: 'User',
          permissions: [],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    } as Notification;

    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  // Subscribe to realtime notifications
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    socket.on('notification', handleRealtimeNotification);

    return () => {
      socket.off('notification', handleRealtimeNotification);
    };
  }, [isAuthenticated, handleRealtimeNotification]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread' && !notification.isRead) ||
        (filter === 'read' && notification.isRead);

      const matchesType =
        typeFilter === 'all' || notification.type === typeFilter;

      return matchesFilter && matchesType;
    });
  }, [notifications, filter, typeFilter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif,
        ),
      );
    } catch {
      // Silently handle mark as read errors
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(notif =>
          !notif.isRead
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif,
        ),
      );
    } catch {
      // Silently handle mark all as read errors
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId),
      );
    } catch {
      // Silently handle delete notification errors
    }
  };

  const handleDeleteSelected = async () => {
    try {
      if (selectedNotifications.length === 0) return;
      await deleteNotifications(selectedNotifications);
      setNotifications(prev =>
        prev.filter(notif => !selectedNotifications.includes(notif.id)),
      );
      setSelectedNotifications([]);
    } catch {
      // Silently handle delete selected notifications errors
    }
  };

  const handleSelectNotification = (
    notificationId: string,
    checked: boolean,
  ) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId]);
    } else {
      setSelectedNotifications(prev =>
        prev.filter(id => id !== notificationId),
      );
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'reply':
        return <Reply className="h-4 w-4" />;
      case 'comment_like':
        return <Heart className="h-4 w-4" />;
      case 'rating':
        return <Star className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'document_approved':
      case 'moderation':
        return <CheckCircle className="h-4 w-4" />;
      case 'collaboration':
        return <Users className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-500';
      case 'reply':
        return 'bg-indigo-500';
      case 'comment_like':
        return 'bg-red-500';
      case 'rating':
        return 'bg-yellow-500';
      case 'system':
        return 'bg-gray-500';
      case 'document_approved':
      case 'moderation':
        return 'bg-green-500';
      case 'collaboration':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    try {
      const now = new Date();
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Không xác định';
      }

      const diffInSeconds = Math.floor(
        (now.getTime() - dateObj.getTime()) / 1000,
      );

      if (diffInSeconds < 60) return 'Vừa xong';
      if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)} phút trước`;
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
      if (diffInSeconds < 2592000)
        return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
      return dateObj.toLocaleDateString();
    } catch {
      return 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Thông báo</h1>
            <p className="text-muted-foreground">Cập nhật hoạt động của bạn</p>
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="animate-pulse p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} thông báo chưa đọc`
              : 'Đã cập nhật tất cả!'}
            ;
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
          {selectedNotifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa đã chọn
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa thông báo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa {selectedNotifications.length}{' '}
                    thông báo{selectedNotifications.length > 1 ? 's' : ''}? Hành
                    động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Bộ lọc:</span>
            </div>
            <Select
              value={filter}
              onValueChange={(value: any) => setFilter(value)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="unread">Chưa đọc</SelectItem>
                <SelectItem value="read">Đã đọc</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="comment">Bình luận</SelectItem>
                <SelectItem value="reply">Trả lời</SelectItem>
                <SelectItem value="comment_like">Thích bình luận</SelectItem>
                <SelectItem value="rating">Đánh giá</SelectItem>
                <SelectItem value="system">Hệ thống</SelectItem>
                <SelectItem value="document_approved">Duyệt</SelectItem>
                <SelectItem value="moderation">Kiểm duyệt</SelectItem>
                <SelectItem value="collaboration">Cộng tác</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
              <h3 className="text-muted-foreground mb-2 text-lg font-medium">
                Không có thông báo
              </h3>
              <p className="text-muted-foreground text-sm">
                {filter === 'all'
                  ? 'Bạn đã cập nhật tất cả! Không có thông báo nào để hiển thị.'
                  : `Không tìm thấy thông báo ${filter}.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center space-x-2 p-2">
              <Checkbox
                checked={
                  selectedNotifications.length ===
                    filteredNotifications.length &&
                  filteredNotifications.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-muted-foreground text-sm">
                Chọn tất cả ({filteredNotifications.length})
              </span>
            </div>

            {filteredNotifications.map(notification => {
              const documentId = notification.data?.documentId;
              const handleNavigate = () => {
                if (documentId) {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification.id);
                  }
                  navigate(`/documents/${documentId}`);
                }
              };

              return (
                <Card
                  key={notification.id}
                  className={`${
                    !notification.isRead ? 'border-primary/20 bg-primary/5' : ''
                  } ${documentId ? 'hover:bg-muted/50 cursor-pointer transition-colors' : ''}`}
                  onClick={documentId ? handleNavigate : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedNotifications.includes(
                          notification.id,
                        )}
                        onCheckedChange={checked =>
                          handleSelectNotification(
                            notification.id,
                            checked as boolean,
                          )
                        }
                        onClick={e => e.stopPropagation()}
                      />
                      <div
                        className={`rounded-full p-2 ${getNotificationColor(notification.type)} flex items-center justify-center`}
                      >
                        <span className="text-white">
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {notification.title}
                            </h4>
                            <p className="text-muted-foreground text-sm">
                              {notification.message}
                            </p>
                          </div>
                          <div className="ml-4 flex items-center space-x-2">
                            {!notification.isRead && (
                              <Badge variant="default" className="text-xs">
                                Mới
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {notification.type.replace('_', ' ')}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {documentId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleNavigate();
                              }}
                            >
                              <ExternalLink className="mr-1 h-3 w-3" />
                              Xem
                            </Button>
                          )}
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Đánh dấu đã đọc
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent
                              onClick={e => e.stopPropagation()}
                            >
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Xóa thông báo
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bạn có chắc chắn muốn xóa thông báo này? Hành
                                  động này không thể hoàn tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Hủy</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteNotification(notification.id)
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Xóa
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
