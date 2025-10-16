import {
  Calendar,
  Download,
  Eye,
  MessageSquare,
  Star,
  Upload,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/loading-skeleton';
import type { DashboardActivity } from '@/types';

interface ActivityFeedProps {
  activities: DashboardActivity[];
  isLoading?: boolean;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'upload':
      return Upload;
    case 'download':
      return Download;
    case 'view':
      return Eye;
    case 'comment':
      return MessageSquare;
    case 'rate':
      return Star;
    case 'login':
      return User;
    default:
      return Calendar;
  }
};

const getActivityColor = (action: string) => {
  switch (action) {
    case 'upload':
      return 'bg-green-500';
    case 'download':
      return 'bg-blue-500';
    case 'view':
      return 'bg-purple-500';
    case 'comment':
      return 'bg-orange-500';
    case 'rate':
      return 'bg-yellow-500';
    case 'login':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

export function ActivityFeed({
  activities,
  isLoading = false,
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa có hoạt động nào được ghi nhận.
          </p>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 10).map(activity => {
              const Icon = getActivityIcon(activity.action);
              const colorClass = getActivityColor(activity.action);
              const displayName = activity.user
                ? [activity.user.firstName, activity.user.lastName]
                    .filter((name): name is string =>
                      Boolean(name && name.trim()),
                    )
                    .join(' ') ||
                  activity.user.username ||
                  'Người dùng'
                : 'Hệ thống';

              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{displayName}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.action}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {activity.action === 'upload' &&
                        'Đã tải lên tài liệu mới'}
                      {activity.action === 'download' &&
                        'Đã tải xuống tài liệu'}
                      {activity.action === 'view' && 'Đã xem tài liệu'}
                      {activity.action === 'comment' &&
                        'Đã bình luận về tài liệu'}
                      {activity.action === 'rate' && 'Đã đánh giá tài liệu'}
                      {activity.action === 'login' && 'Đã đăng nhập'}
                      {![
                        'upload',
                        'download',
                        'view',
                        'comment',
                        'rate',
                        'login',
                      ].includes(activity.action) &&
                        `Performed ${activity.action}`}
                    </p>
                    <div className="text-muted-foreground flex items-center space-x-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
