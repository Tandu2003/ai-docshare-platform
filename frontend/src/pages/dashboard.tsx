import { useEffect, useState } from 'react';

import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { PopularCategories } from '@/components/dashboard/popular-categories';
import { RecentDocuments } from '@/components/dashboard/recent-documents';
import { DashboardStatsCards } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateDashboardStats } from '@/services/mock-data.service';
import type { DashboardStats } from '@/types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const dashboardStats = generateDashboardStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your AI DocShare dashboard. Here you can manage your documents and view
            analytics.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your AI DocShare dashboard. Here you can manage your documents and view
          analytics.
        </p>
      </div>

      {/* Statistics Cards */}
      <DashboardStatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Documents */}
        <div className="lg:col-span-2">
          <RecentDocuments documents={stats.recentDocuments} />
        </div>

        {/* Popular Categories */}
        <div>
          <PopularCategories categories={stats.popularCategories} />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <ActivityFeed activities={stats.userActivity} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Document Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Published</span>
                <span className="text-sm font-medium">
                  {stats.recentDocuments.filter((doc) => doc.isApproved && !doc.isDraft).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Draft</span>
                <span className="text-sm font-medium">
                  {stats.recentDocuments.filter((doc) => doc.isDraft).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium">
                  {stats.recentDocuments.filter((doc) => !doc.isApproved && !doc.isDraft).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Public</span>
                <span className="text-sm font-medium">
                  {stats.recentDocuments.filter((doc) => doc.isPublic).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Premium</span>
                <span className="text-sm font-medium">
                  {stats.recentDocuments.filter((doc) => doc.isPremium).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Private</span>
                <span className="text-sm font-medium">
                  {stats.recentDocuments.filter((doc) => !doc.isPublic).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentNotifications.slice(0, 3).map((notification) => (
                <div key={notification.id} className="text-sm">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
