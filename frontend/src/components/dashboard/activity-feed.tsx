import { Calendar, Download, Eye, MessageSquare, Star, Upload, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityLog } from '@/types';

interface ActivityFeedProps {
  activities: ActivityLog[];
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

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 10).map((activity) => {
            const Icon = getActivityIcon(activity.action);
            const colorClass = getActivityColor(activity.action);

            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {activity.user?.firstName} {activity.user?.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activity.action}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.action === 'upload' && 'Uploaded a new document'}
                    {activity.action === 'download' && 'Downloaded a document'}
                    {activity.action === 'view' && 'Viewed a document'}
                    {activity.action === 'comment' && 'Commented on a document'}
                    {activity.action === 'rate' && 'Rated a document'}
                    {activity.action === 'login' && 'Logged in'}
                    {!['upload', 'download', 'view', 'comment', 'rate', 'login'].includes(
                      activity.action
                    ) && `Performed ${activity.action}`}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(activity.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
