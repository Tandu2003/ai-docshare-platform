import { type ComponentType } from 'react';

import {
  Download,
  Eye,
  FileText,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  description,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="text-muted-foreground flex items-center space-x-1 text-xs">
            {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span
              className={
                isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : ''
              }
            >
              {change > 0 ? '+' : ''}
              {change}%
            </span>
            {changeLabel && <span>from {changeLabel}</span>}
          </div>
        )}
        {description && (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsCardsProps {
  stats: {
    totalDocuments: number;
    totalUsers: number;
    totalDownloads: number;
    totalViews: number;
  };
}

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tổng tài liệu"
        value={stats.totalDocuments.toLocaleString()}
        change={12}
        changeLabel="tháng trước"
        icon={FileText}
        description="Tài liệu trong nền tảng"
      />
      <StatCard
        title="Tổng người dùng"
        value={stats.totalUsers.toLocaleString()}
        change={8}
        changeLabel="tháng trước"
        icon={Users}
        description="Người dùng đã đăng ký"
      />
      <StatCard
        title="Tổng lượt tải"
        value={stats.totalDownloads.toLocaleString()}
        change={-2}
        changeLabel="tháng trước"
        icon={Download}
        description="Lượt tải tài liệu"
      />
      <StatCard
        title="Tổng lượt xem"
        value={stats.totalViews.toLocaleString()}
        change={15}
        changeLabel="tháng trước"
        icon={Eye}
        description="Lượt xem tài liệu"
      />
    </div>
  );
}
