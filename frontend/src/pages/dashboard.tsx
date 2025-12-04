import { useEffect, useState } from 'react';

import { AdminOnly } from '@/components/common/permission-gate';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { PopularCategories } from '@/components/dashboard/popular-categories';
import { RecentDocuments } from '@/components/dashboard/recent-documents';
import { UserDashboard } from '@/components/dashboard/user-dashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading-skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import {
  getDashboardOverview,
  getUserDashboardOverview,
} from '@/services/dashboard.service';
import type { DashboardOverview } from '@/types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safe permissions check
  let isAdmin = false;
  try {
    const permissions = usePermissions();
    isAdmin = permissions.isAdmin();
  } catch (error) {
    console.warn('Failed to get permissions:', error);
  }

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use different endpoints based on user role
      const dashboardData = isAdmin
        ? await getDashboardOverview()
        : await getUserDashboardOverview();
      setStats(dashboardData);
    } catch (fetchError) {
      console.error('Failed to fetch dashboard stats:', fetchError);
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Không thể tải dữ liệu dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <LoadingPage
        title="Bảng điều khiển"
        description="Chào mừng đến với bảng điều khiển DocShare của bạn. Tại đây bạn có thể quản lý tài liệu và xem phân tích."
        showStats={true}
        showTable={false}
        showList={false}
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bảng điều khiển</h1>
          <p className="text-muted-foreground">
            Chào mừng đến với bảng điều khiển DocShare của bạn. Tại đây bạn có
            thể quản lý tài liệu và xem phân tích. analytics.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Không thể tải dữ liệu</AlertTitle>
          <AlertDescription className="flex flex-col space-y-4">
            <span>{error}</span>
            <Button variant="secondary" onClick={fetchDashboardData}>
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          Không thể tải dữ liệu bảng điều khiển
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin ? 'Bảng điều khiển quản trị' : 'Bảng điều khiển'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'Chào mừng đến với bảng điều khiển quản trị DocShare. Tại đây bạn có thể quản lý toàn bộ hệ thống, người dùng và xem thống kê chi tiết.'
            : 'Chào mừng đến với bảng điều khiển DocShare của bạn. Tại đây bạn có thể quản lý tài liệu và xem thông tin cá nhân.'}
        </p>
      </div>

      {/* Admin Dashboard */}
      <AdminOnly>
        <AdminDashboard stats={stats} />
      </AdminOnly>

      {/* User Dashboard */}
      {!isAdmin && <UserDashboard stats={stats} />}

      {/* Common sections for both admin and user */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Recent Documents - Show for everyone */}
        <div className="lg:col-span-2">
          <RecentDocuments
            documents={stats.recentDocuments}
            isLoading={loading}
          />
        </div>

        {/* Popular Categories - Show for everyone */}
        <div>
          <PopularCategories
            categories={stats.popularCategories}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Activity Feed - Show for everyone */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2">
          <ActivityFeed activities={stats.userActivity} isLoading={loading} />
        </div>
      </div>

      {/* Additional stats - Only show for admin */}
      <AdminOnly>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái tài liệu hệ thống</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Đã xuất bản
                  </span>
                  <span className="text-sm font-medium">
                    {
                      stats.recentDocuments.filter(
                        doc => doc.isApproved && !doc.isDraft,
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Bản nháp
                  </span>
                  <span className="text-sm font-medium">
                    {stats.recentDocuments.filter(doc => doc.isDraft).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Đang chờ
                  </span>
                  <span className="text-sm font-medium">
                    {
                      stats.recentDocuments.filter(
                        doc => !doc.isApproved && !doc.isDraft,
                      ).length
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loại nội dung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Công khai
                  </span>
                  <span className="text-sm font-medium">
                    {stats.recentDocuments.filter(doc => doc.isPublic).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Premium</span>
                  <span className="text-sm font-medium">
                    {stats.recentDocuments.filter(doc => doc.isPremium).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Riêng tư
                  </span>
                  <span className="text-sm font-medium">
                    {stats.recentDocuments.filter(doc => !doc.isPublic).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông báo gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recentNotifications.slice(0, 3).map(notification => (
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
      </AdminOnly>
    </div>
  );
};
