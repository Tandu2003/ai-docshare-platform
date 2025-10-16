import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Shield, 
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardOverview } from '@/types';

interface AdminDashboardProps {
  stats: DashboardOverview;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Admin Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Hành động quản trị
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin/users" className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span className="text-sm font-medium">Quản lý người dùng</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/analytics" className="flex flex-col items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm font-medium">Phân tích hệ thống</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin/settings" className="flex flex-col items-center gap-2">
                <Shield className="h-6 w-6" />
                <span className="text-sm font-medium">Cài đặt hệ thống</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/admin" className="flex flex-col items-center gap-2">
                <Activity className="h-6 w-6" />
                <span className="text-sm font-medium">Hoạt động hệ thống</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersThisMonth || 0} tháng này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng tài liệu</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newDocumentsThisMonth || 0} tháng này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt tải</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.downloadsThisMonth || 0} tháng này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt xem</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.viewsThisMonth || 0} tháng này
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Trạng thái hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tài liệu đã duyệt</span>
                <Badge variant="default">
                  {stats.recentDocuments.filter(doc => doc.isApproved).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Tài liệu chờ duyệt</span>
                <Badge variant="secondary">
                  {stats.recentDocuments.filter(doc => !doc.isApproved && !doc.isDraft).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bản nháp</span>
                <Badge variant="outline">
                  {stats.recentDocuments.filter(doc => doc.isDraft).length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Cần chú ý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tài liệu cần duyệt</span>
                <Badge variant="destructive">
                  {stats.recentDocuments.filter(doc => !doc.isApproved && !doc.isDraft).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Người dùng chưa xác thực</span>
                <Badge variant="secondary">
                  {stats.unverifiedUsers || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Báo cáo chưa xử lý</span>
                <Badge variant="outline">
                  {stats.pendingReports || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động hệ thống gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.userActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};