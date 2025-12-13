import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Search,
  ShieldOff,
  ShieldX,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks';
import {
  shareLinkHistoryService,
  type GetShareLinksParams,
  type ShareLinkHistoryItem,
  type ShareLinkStats,
} from '@/services/share-link-history.service';

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

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: vi,
  });
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

export function AdminShareLinksPage(): ReactElement {
  const { isAdmin } = useAuth();
  const [shareLinks, setShareLinks] = useState<ShareLinkHistoryItem[]>([]);
  const [stats, setStats] = useState<ShareLinkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked' | 'expired'
  >('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedShareLink, setSelectedShareLink] =
    useState<ShareLinkHistoryItem | null>(null);
  const limit = 20;

  const isUserAdmin = isAdmin();

  const loadShareLinks = useCallback(async () => {
    if (!isUserAdmin) return;

    try {
      setIsLoading(true);
      const params: GetShareLinksParams = {
        page,
        limit,
        documentId: appliedSearch || undefined,
        isRevoked:
          statusFilter === 'all' ? undefined : statusFilter === 'revoked',
        isExpired:
          statusFilter === 'all' ? undefined : statusFilter === 'expired',
        sortBy,
        sortOrder,
      };

      const response = await shareLinkHistoryService.getAllShareLinks(params);
      setShareLinks(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải danh sách liên kết chia sẻ',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isUserAdmin, page, appliedSearch, statusFilter, sortBy, sortOrder]);

  const loadStats = useCallback(async () => {
    if (!isUserAdmin) return;

    try {
      setIsStatsLoading(true);
      const statsData = await shareLinkHistoryService.getShareLinkStats();
      setStats(statsData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải thống kê liên kết chia sẻ',
      );
    } finally {
      setIsStatsLoading(false);
    }
  }, [isUserAdmin]);

  useEffect(() => {
    void loadShareLinks();
  }, [loadShareLinks]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleSearch = (): void => {
    setAppliedSearch(search);
    setPage(1);
  };

  const handleRevoke = (link: ShareLinkHistoryItem): void => {
    setSelectedShareLink(link);
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = async (): Promise<void> => {
    if (!selectedShareLink) return;

    try {
      await shareLinkHistoryService.revokeShareLink(selectedShareLink.id);
      toast.success('Đã thu hồi liên kết chia sẻ');
      setRevokeDialogOpen(false);
      setSelectedShareLink(null);
      void loadShareLinks();
      void loadStats();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể thu hồi liên kết chia sẻ',
      );
    }
  };

  const handleCopyLink = async (shareUrl: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã sao chép liên kết chia sẻ');
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  const getStatusBadge = (link: ShareLinkHistoryItem) => {
    if (link.isRevoked) {
      return (
        <Badge variant="destructive" className="gap-1">
          <ShieldX className="h-3 w-3" />
          Đã thu hồi
        </Badge>
      );
    }
    if (link.isExpired) {
      return (
        <Badge variant="secondary" className="gap-1">
          <ShieldOff className="h-3 w-3" />
          Đã hết hạn
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <ExternalLink className="h-3 w-3" />
        Đang hoạt động
      </Badge>
    );
  };

  if (!isUserAdmin) {
    return <UnauthorizedMessage />;
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Liên kết Chia sẻ</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý và theo dõi tất cả liên kết chia sẻ trong hệ thống
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void loadShareLinks();
            void loadStats();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
            <Link2 className="text-muted-foreground h-4 w-4" />
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
            <ExternalLink className="h-4 w-4 text-green-500" />
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
            <CardTitle className="text-sm font-medium">Đã thu hồi</CardTitle>
            <ShieldX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats?.revoked.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã hết hạn</CardTitle>
            <ShieldOff className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">
                {stats?.expired.toLocaleString() || 0}
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
              <Label htmlFor="search">Tìm kiếm theo ID tài liệu</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="search"
                  placeholder="Nhập ID tài liệu..."
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
              <Label htmlFor="statusFilter">Trạng thái</Label>
              <Select
                value={statusFilter}
                onValueChange={value => {
                  setStatusFilter(
                    value as 'all' | 'active' | 'revoked' | 'expired',
                  );
                  setPage(1);
                }}
              >
                <SelectTrigger id="statusFilter" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="revoked">Đã thu hồi</SelectItem>
                  <SelectItem value="expired">Đã hết hạn</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="expiresAt">Ngày hết hạn</SelectItem>
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
                  <SelectItem value="asc">Tăng dần</SelectItem>
                  <SelectItem value="desc">Giảm dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Links List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách liên kết ({total} liên kết)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : shareLinks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Không có liên kết chia sẻ nào
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {shareLinks.map(link => (
                  <Card key={link.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {link.document.title}
                          </h3>
                          {getStatusBadge(link)}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span>{formatUserName(link.createdBy)}</span>
                          <span>•</span>
                          <span>{link.createdBy.email}</span>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          <p>
                            Tạo lúc: {formatDate(link.createdAt)} (
                            {formatRelativeTime(link.createdAt)})
                          </p>
                          <p>
                            Hết hạn: {formatDate(link.expiresAt)} (
                            {formatRelativeTime(link.expiresAt)})
                          </p>
                          <p className="font-mono text-xs">
                            api-key: {link.token.substring(0, 16)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyLink(link.shareUrl)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sao chép liên kết</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(link.shareUrl, '_blank')
                                }
                                disabled={link.isRevoked || link.isExpired}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mở liên kết</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {!link.isRevoked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRevoke(link)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Thu hồi liên kết</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Trang {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi liên kết chia sẻ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn thu hồi liên kết chia sẻ này không? Liên kết
              sẽ không thể sử dụng sau khi thu hồi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRevoke}>
              Thu hồi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
