import { Download, Eye, FileText, TrendingDown, TrendingUp, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
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
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : ''}>
              {change > 0 ? '+' : ''}
              {change}%
            </span>
            {changeLabel && <span>from {changeLabel}</span>}
          </div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
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
        title="Total Documents"
        value={stats.totalDocuments.toLocaleString()}
        change={12}
        changeLabel="last month"
        icon={FileText}
        description="Documents in the platform"
      />
      <StatCard
        title="Total Users"
        value={stats.totalUsers.toLocaleString()}
        change={8}
        changeLabel="last month"
        icon={Users}
        description="Registered users"
      />
      <StatCard
        title="Total Downloads"
        value={stats.totalDownloads.toLocaleString()}
        change={-2}
        changeLabel="last month"
        icon={Download}
        description="Document downloads"
      />
      <StatCard
        title="Total Views"
        value={stats.totalViews.toLocaleString()}
        change={15}
        changeLabel="last month"
        icon={Eye}
        description="Document views"
      />
    </div>
  );
}
