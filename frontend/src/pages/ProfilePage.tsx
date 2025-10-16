import { useEffect, useState } from 'react';

import {
  Calendar,
  Download,
  Edit,
  Eye,
  Star,
  Upload,
  User,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks';
import {
  BOOKMARKS_UPDATED_EVENT,
  getUserBookmarks,
  type BookmarkWithDocument,
} from '@/services/bookmark.service';
import {
  DocumentsService,
  type Document as UserDocument,
} from '@/services/files.service';
import { mockActivityLogs } from '@/services/mock-data.service';
import type { ActivityLog } from '@/types';
import { formatDate } from '@/utils/date';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<BookmarkWithDocument[]>(
    [],
  );
  const [userActivity, setUserActivity] = useState<ActivityLog[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || '',
    bio: user?.bio || '',
    phone: '',
    location: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Get user's documents from API
        const userDocsResponse = await DocumentsService.getUserDocuments(1, 20);
        setUserDocuments(userDocsResponse.documents ?? []);

        // Get user's bookmarks
        const bookmarks = await getUserBookmarks();
        setUserBookmarks(bookmarks);

        // Get user's activity
        const activity = mockActivityLogs.filter(
          log => log.userId === user?.id,
        );
        setUserActivity(activity);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      void fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleBookmarksUpdated = () => {
      void getUserBookmarks()
        .then(bookmarks => setUserBookmarks(bookmarks))
        .catch(error => console.error('Failed to refresh bookmarks', error));
    };

    window.addEventListener(BOOKMARKS_UPDATED_EVENT, handleBookmarksUpdated);
    return () =>
      window.removeEventListener(
        BOOKMARKS_UPDATED_EVENT,
        handleBookmarksUpdated,
      );
  }, [user]);

  const handleSaveProfile = () => {
    // In real app, this would update the user profile via API
    console.log('Saving profile:', formData);
    setIsEditDialogOpen(false);
  };

  const getUserStats = () => {
    const totalDownloads = userDocuments.reduce(
      (sum, doc) => sum + (doc.downloadCount ?? 0),
      0,
    );
    const totalViews = userDocuments.reduce(
      (sum, doc) => sum + (doc.viewCount ?? 0),
      0,
    );
    const averageRating =
      userDocuments.length > 0
        ? userDocuments.reduce(
            (sum, doc) => sum + (doc.averageRating ?? 0),
            0,
          ) / userDocuments.length
        : 0;

    return {
      documentCount: userDocuments.length,
      totalDownloads,
      totalViews,
      averageRating,
      bookmarkCount: userBookmarks.length,
    };
  };

  const stats = getUserStats();

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return Upload;
      case 'download':
        return Download;
      case 'view':
        return Eye;
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
      case 'login':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Profile Header Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex animate-pulse items-start space-x-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="animate-pulse p-4">
                <Skeleton className="mb-2 h-8 w-8" />
                <Skeleton className="mb-1 h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          Vui lòng đăng nhập để xem hồ sơ của bạn
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold">
                    {user.firstName} {user.lastName}
                  </h1>
                  <Badge variant={user.isVerified ? 'default' : 'secondary'}>
                    {user.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">@{user.username}</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
                {user.bio && <p className="text-sm">{user.bio}</p>}
                <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Tham gia {formatDate(user.createdAt)}</span>
                  </div>
                  {user.lastLoginAt && (
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>
                        Lần cuối hoạt động {formatDate(user.lastLoginAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa hồ sơ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Tên</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Họ</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Tên đăng nhập</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Tiểu sử</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, bio: e.target.value }))
                      }
                      placeholder="Hãy cho chúng tôi biết về bạn..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button onClick={handleSaveProfile}>Lưu thay đổi</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Upload className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.documentCount}</p>
                <p className="text-muted-foreground text-sm">Tài liệu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                <p className="text-muted-foreground text-sm">Lượt tải</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
                <p className="text-muted-foreground text-sm">Lượt xem</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {stats.averageRating.toFixed(1)}
                </p>
                <p className="text-muted-foreground text-sm">Đánh giá TB</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.bookmarkCount}</p>
                <p className="text-muted-foreground text-sm">Đánh dấu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">Tài liệu của tôi</TabsTrigger>
          <TabsTrigger value="bookmarks">Đánh dấu</TabsTrigger>
          <TabsTrigger value="activity">Hoạt động</TabsTrigger>
        </TabsList>

        {/* My Documents */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tài liệu của tôi</CardTitle>
            </CardHeader>
            <CardContent>
              {userDocuments.length === 0 ? (
                <div className="py-8 text-center">
                  <Upload className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="text-muted-foreground mb-2 text-lg font-medium">
                    Chưa có tài liệu nào
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Bắt đầu chia sẻ kiến thức của bạn bằng cách tải lên tài liệu
                    đầu tiên.
                  </p>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Tải lên tài liệu
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userDocuments.map(document => {
                    const categoryIcon = document.category?.icon ?? '📄';
                    const categoryName =
                      document.category?.name ?? 'Uncategorized';
                    const createdAt = formatDate(document.createdAt);
                    const downloadCount = document.downloadCount ?? 0;
                    const viewCount = document.viewCount ?? 0;
                    const averageRatingDisplay =
                      document.averageRating !== undefined
                        ? document.averageRating.toFixed(1)
                        : '0.0';
                    const isApproved = Boolean(document.isApproved);
                    const moderationStatus =
                      document.moderationStatus ??
                      (isApproved ? 'APPROVED' : 'PENDING');
                    const statusLabel = document.isDraft
                      ? 'Bản nháp'
                      : moderationStatus === 'APPROVED'
                        ? 'Đã duyệt'
                        : moderationStatus === 'REJECTED'
                          ? 'Bị từ chối'
                          : 'Đang chờ';
                    const statusVariant = document.isDraft
                      ? 'outline'
                      : moderationStatus === 'APPROVED'
                        ? 'default'
                        : moderationStatus === 'REJECTED'
                          ? 'destructive'
                          : 'secondary';

                    return (
                      <div
                        key={document.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{categoryIcon}</div>
                          <div>
                            <h4 className="font-medium">{document.title}</h4>
                            <p className="text-muted-foreground text-sm">
                              {categoryName}
                              {createdAt !== '—' ? ` • ${createdAt}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Download className="h-4 w-4" />
                            <span>{downloadCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{viewCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4" />
                            <span>{averageRatingDisplay}</span>
                          </div>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </div>
                        {moderationStatus === 'REJECTED' &&
                          document.rejectionReason && (
                            <p className="text-destructive mt-2 text-sm">
                              Lý do từ chối: {document.rejectionReason}
                            </p>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookmarks */}
        <TabsContent value="bookmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Đánh dấu của tôi</CardTitle>
            </CardHeader>
            <CardContent>
              {userBookmarks.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="text-muted-foreground mb-2 text-lg font-medium">
                    Chưa có đánh dấu nào
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Đánh dấu các tài liệu bạn thấy thú vị để dễ dàng truy cập
                    chúng sau này.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBookmarks.map(bookmark => {
                    const document = bookmark.document;
                    const ratingValue = Number(
                      document.averageRating ?? 0,
                    ).toFixed(1);
                    const categoryIcon = document.category?.icon ?? '📄';
                    const bookmarkDate = formatDate(bookmark.createdAt);
                    const categoryName =
                      document.category?.name ?? 'Uncategorized';

                    return (
                      <div
                        key={bookmark.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{categoryIcon}</div>
                          <div>
                            <h4 className="font-medium">{document.title}</h4>
                            <p className="text-muted-foreground text-sm">
                              {categoryName}
                              {bookmarkDate !== '—' ? ` • ${bookmarkDate}` : ''}
                            </p>
                            {bookmark.notes && (
                              <p className="text-muted-foreground mt-1 text-sm italic">
                                "{bookmark.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Download className="h-4 w-4" />
                            <span>{document.downloadCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{document.viewCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4" />
                            <span>{ratingValue}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              {userActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="text-muted-foreground mb-2 text-lg font-medium">
                    Chưa có hoạt động nào
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Hoạt động của bạn sẽ xuất hiện ở đây khi bạn sử dụng nền
                    tảng.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userActivity.slice(0, 10).map(activity => {
                    const Icon = getActivityIcon(activity.action);
                    const colorClass = getActivityColor(activity.action);

                    return (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-3"
                      >
                        <div className={`rounded-full p-2 ${colorClass}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {activity.action === 'upload' &&
                              'Đã tải lên tài liệu mới'}
                            {activity.action === 'download' &&
                              'Đã tải xuống tài liệu'}
                            {activity.action === 'view' && 'Đã xem tài liệu'}
                            {activity.action === 'login' && 'Đã đăng nhập'}
                            {!['upload', 'download', 'view', 'login'].includes(
                              activity.action,
                            ) && `Thực hiện ${activity.action}`}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
