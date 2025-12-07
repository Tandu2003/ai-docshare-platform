import { useEffect, useMemo, useState, type ReactElement } from 'react';

import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Coins,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Shield,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  pointsService,
  type PointTransaction,
} from '@/services/points.service';
import { formatDate } from '@/utils/date';

type RangeFilter = '7d' | '30d' | '90d' | 'all';

const RANGE_OPTIONS: { value: RangeFilter; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
  { value: 'all', label: 'Toàn thời gian' },
];

const TYPE_OPTIONS: Array<{
  value: PointTransaction['type'] | 'all';
  label: string;
}> = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'EARN', label: 'Cộng điểm' },
  { value: 'SPEND', label: 'Trừ điểm' },
  { value: 'ADJUST', label: 'Điều chỉnh' },
];

const REASON_OPTIONS: Array<{
  value: PointTransaction['reason'] | 'all';
  label: string;
}> = [
  { value: 'all', label: 'Tất cả lý do' },
  { value: 'UPLOAD_REWARD', label: 'Thưởng tải lên' },
  { value: 'DOWNLOAD_COST', label: 'Trừ khi tải' },
  { value: 'DOWNLOAD_REWARD', label: 'Thưởng khi tài liệu được tải' },
  { value: 'ADMIN_ADJUST', label: 'Điều chỉnh bởi admin' },
];

const formatPoints = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

const reasonLabel = (reason: PointTransaction['reason']) => {
  switch (reason) {
    case 'UPLOAD_REWARD':
      return 'Thưởng tải lên';
    case 'DOWNLOAD_COST':
      return 'Trừ khi tải';
    case 'DOWNLOAD_REWARD':
      return 'Thưởng tải tài liệu';
    case 'ADMIN_ADJUST':
    default:
      return 'Điều chỉnh bởi admin';
  }
};

const typeLabel = (type: PointTransaction['type']) => {
  switch (type) {
    case 'EARN':
      return 'Cộng điểm';
    case 'SPEND':
      return 'Trừ điểm';
    default:
      return 'Điều chỉnh';
  }
};

const typeBadgeVariant = (type: PointTransaction['type']) => {
  switch (type) {
    case 'EARN':
      return 'secondary' as const;
    case 'SPEND':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
};

const calculateFromDate = (range: RangeFilter) => {
  if (range === 'all') return undefined;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from.toISOString();
};

export function AdminPointsPage(): ReactElement {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<
    PointTransaction['type'] | 'all'
  >('all');
  const [reasonFilter, setReasonFilter] = useState<
    PointTransaction['reason'] | 'all'
  >('all');
  const [range, setRange] = useState<RangeFilter>('30d');
  const limit = 15;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          page,
          limit,
          search: appliedSearch || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          reason: reasonFilter !== 'all' ? reasonFilter : undefined,
        };

        const fromDate = calculateFromDate(range);
        if (fromDate) {
          params.from = fromDate;
          params.to = new Date().toISOString();
        }

        const res = await pointsService.adminGetTransactions(params);
        setTransactions(res.items || []);
        setTotal(res.total || 0);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải lịch sử giao dịch điểm',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadTransactions();
  }, [page, appliedSearch, typeFilter, reasonFilter, range]);

  const summary = useMemo(() => {
    const earned = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const spent = transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return {
      earned,
      spent,
      net: earned - spent,
    };
  }, [transactions]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const handleRangeChange = (value: RangeFilter) => {
    setPage(1);
    setRange(value);
  };

  const handleTypeChange = (value: PointTransaction['type'] | 'all') => {
    setPage(1);
    setTypeFilter(value);
  };

  const handleReasonChange = (value: PointTransaction['reason'] | 'all') => {
    setPage(1);
    setReasonFilter(value);
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Coins className="text-primary h-8 w-8" />
            Lịch sử giao dịch điểm
          </h1>
          <p className="text-muted-foreground">
            Theo dõi mọi biến động điểm của người dùng trên hệ thống
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPage(1);
            setAppliedSearch(search.trim());
          }}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Điểm cộng (trang hiện tại)
                </p>
                <p className="text-2xl font-bold text-green-600">
                  +{formatPoints(summary.earned)}
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3 text-green-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Điểm trừ (trang hiện tại)
                </p>
                <p className="text-2xl font-bold text-red-600">
                  -{formatPoints(summary.spent)}
                </p>
              </div>
              <div className="rounded-full bg-red-500/10 p-3 text-red-600">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Điểm ròng (trang hiện tại)
                </p>
                <p
                  className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {summary.net >= 0 ? '+' : ''}
                  {formatPoints(summary.net)}
                </p>
              </div>
              <div className="bg-primary/10 text-primary rounded-full p-3">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs uppercase">
                  Tổng giao dịch
                </p>
                <p className="text-2xl font-bold">{formatPoints(total)}</p>
                <p className="text-muted-foreground text-xs">
                  Trang {page}/{totalPages}
                </p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3 text-blue-600">
                <Coins className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Tìm kiếm người dùng, ghi chú, tài liệu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="md:col-span-2"
            />
            <Select value={range} onValueChange={handleRangeChange}>
              <SelectTrigger className="w-full min-w-[12rem]">
                <SelectValue placeholder="Khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full min-w-[12rem]">
                <SelectValue placeholder="Loại giao dịch" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reasonFilter} onValueChange={handleReasonChange}>
              <SelectTrigger className="w-full min-w-[14rem]">
                <SelectValue placeholder="Lý do" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSearch}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Search className="h-4 w-4" />
              Áp dụng
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setAppliedSearch('');
                setRange('30d');
                setTypeFilter('all');
                setReasonFilter('all');
                setPage(1);
              }}
              disabled={loading}
            >
              Đặt lại
            </Button>
            <span className="text-muted-foreground text-sm">
              Hiển thị {startItem}-{endItem} / {formatPoints(total)} giao dịch
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử điểm</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead>Liên quan</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(tx => {
                const amountLabel = `${tx.amount > 0 ? '+' : ''}${formatPoints(tx.amount)}`;
                const balanceLabel = formatPoints(tx.balanceAfter);
                const typeVariant = typeBadgeVariant(tx.type);
                const userName =
                  `${tx.user?.firstName ?? ''} ${tx.user?.lastName ?? ''}`.trim() ||
                  tx.user?.username ||
                  'Không rõ';
                const performedBy = tx.performedBy
                  ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}`.trim() ||
                    tx.performedBy.username
                  : null;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{userName}</span>
                        <span className="text-muted-foreground text-xs">
                          @{tx.user?.username ?? 'ẩn danh'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={tx.amount >= 0 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {tx.amount >= 0 ? (
                            <ArrowUp className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="mr-1 h-3 w-3" />
                          )}
                          {amountLabel}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          Số dư: {balanceLabel}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={typeVariant} className="w-fit">
                          {typeLabel(tx.type)}
                        </Badge>
                        <span className="text-xs">
                          {reasonLabel(tx.reason)}
                        </span>
                        {tx.isBypass && (
                          <Badge variant="outline" className="w-fit text-xs">
                            Bỏ qua trừ điểm
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {tx.document ? (
                          <Link
                            to={`/documents/${tx.document.id}`}
                            className="hover:text-primary text-sm font-medium"
                          >
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {tx.document.title}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Không có tài liệu
                          </span>
                        )}
                        {performedBy && (
                          <span className="text-muted-foreground text-xs">
                            Thực hiện bởi {performedBy}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(tx.createdAt, 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserRound className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm">{tx.note || '—'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {transactions.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-6 text-center"
                  >
                    Không có giao dịch nào trong bộ lọc hiện tại
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {loading && (
            <div className="text-muted-foreground py-6 text-center text-sm">
              Đang tải...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground text-sm">
          Hiển thị {startItem}-{endItem} trong tổng số {formatPoints(total)}{' '}
          giao dịch
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
          >
            Trước
          </Button>
          <span className="text-sm">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
