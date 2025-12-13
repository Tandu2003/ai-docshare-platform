import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { formatDistanceToNow, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldOff,
  ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  shareLinkHistoryService,
  type GetShareLinksParams,
  type ShareLinkHistoryItem,
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

export function MyShareLinksPage(): ReactElement {
  const [shareLinks, setShareLinks] = useState<ShareLinkHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const limit = 20;

  const loadShareLinks = useCallback(async () => {
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

      const response = await shareLinkHistoryService.getMyShareLinks(params);
      setShareLinks(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải lịch sử liên kết chia sẻ',
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadShareLinks();
  }, [loadShareLinks]);

  const handleCopyLink = async (shareUrl: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã sao chép liên kết chia sẻ');
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  const handleSearch = (): void => {
    setAppliedSearch(search);
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch();
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

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Lịch sử liên kết chia sẻ
        </h1>
        <p className="text-muted-foreground">
          Quản lý và theo dõi các liên kết chia sẻ tài liệu của bạn
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc và tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Tìm kiếm theo ID tài liệu..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={value => {
                  setStatusFilter(
                    value as 'all' | 'active' | 'revoked' | 'expired',
                  );
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="revoked">Đã thu hồi</SelectItem>
                  <SelectItem value="expired">Đã hết hạn</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={value => {
                  const [newSortBy, newSortOrder] = value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder as 'asc' | 'desc');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Mới nhất</SelectItem>
                  <SelectItem value="createdAt-asc">Cũ nhất</SelectItem>
                  <SelectItem value="expiresAt-desc">
                    Hết hạn sớm nhất
                  </SelectItem>
                  <SelectItem value="expiresAt-asc">
                    Hết hạn muộn nhất
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>Tìm kiếm</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setAppliedSearch('');
                  setStatusFilter('all');
                  setSortBy('createdAt');
                  setSortOrder('desc');
                  setPage(1);
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Skeleton key={i} className="h-24 w-full" />
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
                        <div className="text-muted-foreground text-sm">
                          <p>
                            Đã cập nhật lúc: {formatDate(link.updatedAt)} (
                            {formatRelativeTime(link.updatedAt)})
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
                                disabled={link.isRevoked || link.isExpired}
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
    </div>
  );
}
