import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { UnauthorizedMessage } from '@/components/common/unauthorized-message';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks';
import {
  adminCommentService,
  type AdminComment,
  type CommentStats,
  type GetCommentsParams,
} from '@/services/admin-comment.service';

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatUserName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username;
}

export function AdminCommentsPage(): ReactElement {
  const { isAdmin } = useAuth();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'deleted' | 'all'>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(
    null,
  );
  const [hardDelete, setHardDelete] = useState(false);
  const limit = 20;

  const isUserAdmin = isAdmin();

  const loadComments = useCallback(async () => {
    if (!isUserAdmin) return;

    try {
      setIsLoading(true);
      const params: GetCommentsParams = {
        page,
        limit,
        search: appliedSearch || undefined,
        isDeleted: viewMode === 'all' ? undefined : viewMode === 'deleted',
        sortBy,
        sortOrder,
      };

      const response = await adminCommentService.getComments(params);
      setComments(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách bình luận',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isUserAdmin, page, appliedSearch, viewMode, sortBy, sortOrder]);

  const loadStats = useCallback(async () => {
    if (!isUserAdmin) return;

    try {
      setIsStatsLoading(true);
      const statsData = await adminCommentService.getCommentStats();
      setStats(statsData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải thống kê bình luận',
      );
    } finally {
      setIsStatsLoading(false);
    }
  }, [isUserAdmin]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (!isUserAdmin) {
    return (
      <div className="container mx-auto p-6">
        <UnauthorizedMessage
          title="Không có quyền quản lý bình luận"
          description="Bạn cần có quyền quản trị viên để truy cập trang này."
          action={{
            label: 'Quay lại trang chủ',
            onClick: () => window.history.back(),
          }}
        />
      </div>
    );
  }

  const handleSearch = () => {
    setAppliedSearch(search);
    setPage(1);
  };

  const handleDelete = (comment: AdminComment) => {
    setSelectedComment(comment);
    setHardDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedComment) return;

    try {
      await adminCommentService.deleteComment(selectedComment.id, hardDelete);
      toast.success(
        hardDelete ? 'Đã xóa vĩnh viễn bình luận' : 'Đã xóa bình luận',
      );
      setDeleteDialogOpen(false);
      setSelectedComment(null);
      void loadComments();
      void loadStats();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể xóa bình luận',
      );
    }
  };

  const handleRestore = (comment: AdminComment) => {
    setSelectedComment(comment);
    setRestoreDialogOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedComment) return;

    try {
      await adminCommentService.restoreComment(selectedComment.id);
      toast.success('Đã khôi phục bình luận');
      setRestoreDialogOpen(false);
      setSelectedComment(null);
      void loadComments();
      void loadStats();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể khôi phục bình luận',
      );
    }
  };

  const handleViewModeChange = (value: string) => {
    const mode = value as 'active' | 'deleted' | 'all';
    setViewMode(mode);
    setPage(1);
  };

  const canHardDelete = useMemo(() => {
    return (
      selectedComment &&
      selectedComment._count.replies === 0 &&
      !selectedComment.isDeleted
    );
  }, [selectedComment]);

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Bình luận</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý và điều chỉnh tất cả bình luận trong hệ thống
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void loadComments();
            void loadStats();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
            <MessageSquare className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.total.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đang hoạt động
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats?.active.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã xóa</CardTitle>
            <Trash2 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats?.deleted.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Có phản hồi</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {stats?.withReplies.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Likes TB</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.averageLikes.toFixed(1) || '0.0'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc và Tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <Label htmlFor="search">Tìm kiếm theo nội dung</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="search"
                  placeholder="Nhập từ khóa tìm kiếm..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="md:w-48">
              <Label htmlFor="sortBy">Sắp xếp theo</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sortBy" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Ngày tạo</SelectItem>
                  <SelectItem value="updatedAt">Ngày cập nhật</SelectItem>
                  <SelectItem value="likesCount">Số lượt thích</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:w-32">
              <Label htmlFor="sortOrder">Thứ tự</Label>
              <Select
                value={sortOrder}
                onValueChange={value => setSortOrder(value as 'asc' | 'desc')}
              >
                <SelectTrigger id="sortOrder" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Giảm dần</SelectItem>
                  <SelectItem value="asc">Tăng dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
              <TabsTrigger value="deleted">Đã xóa</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Comments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Bình luận ({total.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">Không có bình luận nào</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {comments.map(comment => (
                  <div
                    key={comment.id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <Avatar>
                          <AvatarImage src={comment.user.avatar || undefined} />
                          <AvatarFallback>
                            {formatUserName(comment.user)
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {formatUserName(comment.user)}
                            </span>
                            <Badge variant="outline">
                              {comment.user.email}
                            </Badge>
                            {comment.isDeleted && (
                              <Badge variant="destructive">Đã xóa</Badge>
                            )}
                            {comment.isEdited && (
                              <Badge variant="secondary">Đã chỉnh sửa</Badge>
                            )}
                            {comment.parent && (
                              <Badge variant="outline">Phản hồi</Badge>
                            )}
                          </div>

                          <p className="text-muted-foreground text-sm">
                            {comment.content}
                          </p>

                          <div className="text-muted-foreground flex items-center gap-4 text-xs">
                            <span>
                              Tài liệu:{' '}
                              <a
                                href={`/documents/${comment.document.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {comment.document.title}
                              </a>
                            </span>
                            <Separator orientation="vertical" />
                            <span>{comment.likesCount} lượt thích</span>
                            <Separator orientation="vertical" />
                            <span>{comment._count.replies} phản hồi</span>
                            <Separator orientation="vertical" />
                            <span>{formatDate(comment.createdAt)}</span>
                          </div>

                          {comment.parent && (
                            <div className="bg-muted mt-2 rounded p-2 text-sm">
                              <span className="text-muted-foreground">
                                Phản hồi:{' '}
                              </span>
                              <span className="italic">
                                {comment.parent.content}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {comment.isDeleted ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(comment)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Khôi phục</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(comment)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Xóa</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Trang {page} / {totalPages} ({total} bình luận)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bình luận</AlertDialogTitle>
            <AlertDialogDescription>
              {hardDelete
                ? 'Bạn có chắc chắn muốn xóa vĩnh viễn bình luận này? Hành động này không thể hoàn tác.'
                : 'Bình luận sẽ bị đánh dấu là đã xóa và không hiển thị công khai.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {canHardDelete && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="hardDelete"
                  checked={hardDelete}
                  onCheckedChange={setHardDelete}
                />
                <Label htmlFor="hardDelete">
                  Xóa vĩnh viễn (không thể khôi phục)
                </Label>
              </div>
            )}
            {selectedComment && selectedComment._count.replies > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Bình luận này có {selectedComment._count.replies} phản hồi.
                  Không thể xóa vĩnh viễn.
                </p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận khôi phục bình luận</AlertDialogTitle>
            <AlertDialogDescription>
              Bình luận sẽ được khôi phục và hiển thị công khai trở lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore}>
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
