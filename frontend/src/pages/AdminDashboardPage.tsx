import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockActivityLogs, mockDocuments, mockUsers } from '@/services/mock-data.service';
import type { ActivityLog, Document, User } from '@/types';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setUsers(mockUsers);
        setDocuments(mockDocuments);
        setActivity(mockActivityLogs);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const getSystemStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.isActive).length;
    const verifiedUsers = users.filter((user) => user.isVerified).length;
    const totalDocuments = documents.length;
    const approvedDocuments = documents.filter((doc) => doc.isApproved).length;
    const pendingDocuments = documents.filter((doc) => !doc.isApproved && !doc.isDraft).length;
    const totalDownloads = documents.reduce((sum, doc) => sum + doc.downloadCount, 0);
    const totalViews = documents.reduce((sum, doc) => sum + doc.viewCount, 0);

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalDocuments,
      approvedDocuments,
      pendingDocuments,
      totalDownloads,
      totalViews,
    };
  };

  const stats = getSystemStats();

  const recentUsers = users
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentDocuments = documents
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentActivity = activity
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="animate-pulse">
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-3 w-full" />
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
      <div className="flex items-center space-x-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeUsers} người dùng đang hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng tài liệu</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">{stats.approvedDocuments} đã duyệt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt tải</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.totalViews.toLocaleString()} tổng lượt xem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">Tài liệu đang chờ xem xét</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="documents">Tài liệu</TabsTrigger>
          <TabsTrigger value="activity">Hoạt động</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Người dùng gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.firstName.charAt(0)}
                          {user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{user.username} • {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge
                          variant={user.isVerified ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                        </Badge>
                        <Badge
                          variant={user.isActive ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {user.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Tài liệu gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentDocuments.map((document) => (
                    <div key={document.id} className="flex items-center space-x-3">
                      <div className="text-lg">{document.category.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{document.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {document.uploader.firstName} {document.uploader.lastName} •{' '}
                          {new Date(document.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge
                          variant={document.isApproved ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {document.isApproved ? 'Đã duyệt' : 'Đang chờ'}
                        </Badge>
                        <Badge
                          variant={document.isPublic ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {document.isPublic ? 'Công khai' : 'Riêng tư'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tất cả người dùng</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tham gia</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.firstName.charAt(0)}
                              {user.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Badge
                            variant={user.isActive ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {user.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                          </Badge>
                          {user.isVerified && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Quản lý
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tất cả tài liệu</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tài liệu</TableHead>
                    <TableHead>Tác giả</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thống kê</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{document.category.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{document.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(document.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {document.uploader.firstName} {document.uploader.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{document.uploader.username}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{document.category.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Badge
                            variant={document.isApproved ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {document.isApproved ? 'Đã duyệt' : 'Đang chờ'}
                          </Badge>
                          {document.isPremium && (
                            <Badge variant="default" className="text-xs bg-yellow-500">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <p>{document.downloadCount} lượt tải</p>
                          <p>{document.viewCount} lượt xem</p>
                          <p>{document.averageRating.toFixed(1)}★</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Quản lý
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động hệ thống</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        {activity.user ? (
                          <>
                            <span className="font-medium">
                              {activity.user.firstName} {activity.user.lastName}
                            </span>{' '}
                            {activity.action === 'upload' && 'đã tải lên tài liệu'}
                            {activity.action === 'download' && 'đã tải xuống tài liệu'}
                            {activity.action === 'view' && 'đã xem tài liệu'}
                            {activity.action === 'login' && 'đã đăng nhập'}
                            {!['upload', 'download', 'view', 'login'].includes(activity.action) &&
                              `đã thực hiện ${activity.action}`}
                          </>
                        ) : (
                          `Hệ thống ${activity.action}`
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
