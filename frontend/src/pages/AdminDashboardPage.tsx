import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  approveModerationDocument,
  generateModerationAnalysis,
  getModerationDocument,
  getModerationQueue,
  rejectModerationDocument,
} from '@/services/document.service';
import type {
  DocumentModerationStatus,
  ModerationDocument,
  ModerationQueueResponse,
} from '@/types';

const statusOptions: { value: DocumentModerationStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'REJECTED', label: 'Bị từ chối' },
  { value: 'APPROVED', label: 'Đã duyệt' },
];

const statusBadgeVariant = (status: DocumentModerationStatus) => {
  switch (status) {
    case 'APPROVED':
      return 'default' as const;
    case 'REJECTED':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
};

const statusLabel = (status: DocumentModerationStatus) => {
  switch (status) {
    case 'APPROVED':
      return 'Đã duyệt';
    case 'REJECTED':
      return 'Bị từ chối';
    default:
      return 'Chờ duyệt';
  }
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch {
    return value;
  }
};

const formatFileSize = (value: number | string) => {
  const size =
    typeof value === 'string' ? parseInt(value, 10) : Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return 'Không xác định';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const emptySummary = {
  pendingDocuments: 0,
  rejectedDocuments: 0,
  approvedToday: 0,
};

export default function AdminDashboardPage() {
  const [statusFilter, setStatusFilter] =
    useState<DocumentModerationStatus>('PENDING');
  const [queueData, setQueueData] = useState<ModerationQueueResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<ModerationDocument | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [publishPublicly, setPublishPublicly] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionDocumentId, setActionDocumentId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const summary = useMemo(
    () => queueData?.summary ?? emptySummary,
    [queueData],
  );

  const pagination = queueData?.pagination;

  const loadQueue = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const data = await getModerationQueue({
          status: statusFilter,
          page,
          limit: 10,
        });
        setQueueData(data);
        setCurrentPage(data.pagination.page);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Không thể tải hàng đợi kiểm duyệt';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    loadQueue(1);
  }, [loadQueue]);

  useEffect(() => {
    if (selectedDocument) {
      setModerationNotes(selectedDocument.moderationNotes ?? '');
      setPublishPublicly(Boolean(selectedDocument.isPublic));
    } else {
      setModerationNotes('');
      setPublishPublicly(true);
    }
  }, [selectedDocument]);

  const handleRefresh = () => {
    loadQueue(currentPage);
  };

  const handleOpenDetail = async (documentId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const document = await getModerationDocument(documentId);
      setSelectedDocument(document);
    } catch (error) {
      setDetailOpen(false);
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể lấy chi tiết tài liệu';
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (
    documentId: string,
    payload: { notes?: string; publish?: boolean } = {},
  ) => {
    setProcessing(true);
    setActionDocumentId(documentId);
    try {
      await approveModerationDocument(documentId, payload);
      toast.success('Tài liệu đã được duyệt');
      if (selectedDocument?.id === documentId) {
        setDetailOpen(false);
        setSelectedDocument(null);
      }
      await loadQueue(currentPage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể duyệt tài liệu';
      toast.error(message);
    } finally {
      setProcessing(false);
      setActionDocumentId(null);
    }
  };

  const startReject = (document: { id: string; title: string }) => {
    setPendingAction(document);
    setRejectReason('');
    setRejectNotes('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!pendingAction) {
      return;
    }
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setProcessing(true);
    setActionDocumentId(pendingAction.id);
    try {
      await rejectModerationDocument(pendingAction.id, {
        reason: rejectReason,
        notes: rejectNotes || undefined,
      });
      toast.success('Tài liệu đã bị từ chối');
      if (selectedDocument?.id === pendingAction.id) {
        setDetailOpen(false);
        setSelectedDocument(null);
      }
      setRejectDialogOpen(false);
      await loadQueue(currentPage);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể từ chối tài liệu này';
      toast.error(message);
    } finally {
      setProcessing(false);
      setActionDocumentId(null);
    }
  };

  const handleGenerateAi = async (documentId: string) => {
    setAiLoading(true);
    try {
      const result = await generateModerationAnalysis(documentId);
      if (result.success) {
        toast.success('Đã phân tích AI cho tài liệu');
      } else {
        toast.error('Phân tích AI chưa thành công, thử lại sau');
      }
      setSelectedDocument(prev =>
        prev
          ? {
              ...prev,
              aiAnalysis: result.analysis ?? prev.aiAnalysis,
            }
          : prev,
      );
      await loadQueue(currentPage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể chạy phân tích AI';
      toast.error(message);
    } finally {
      setAiLoading(false);
    }
  };

  const documents = queueData?.documents ?? [];

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.uploader.email?.toLowerCase().includes(query) ||
        doc.uploader.username?.toLowerCase().includes(query),
    );
  }, [documents, searchQuery]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
            <ShieldCheck className="text-primary h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Hàng đợi kiểm duyệt
            </h1>
            <p className="text-muted-foreground">
              Quản lý và xét duyệt tài liệu với hỗ trợ AI
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-yellow-500 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.pendingDocuments}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Tài liệu cần xét duyệt
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-destructive border-l-4 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bị từ chối</CardTitle>
            <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
              <XCircle className="text-destructive h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {summary.rejectedDocuments}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Yêu cầu chỉnh sửa
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đã duyệt hôm nay
            </CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.approvedToday}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Tài liệu đã được phê duyệt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ClipboardList className="h-5 w-5" />
                Danh sách tài liệu
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {filteredDocuments.length} / {documents.length} tài liệu
              </p>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm tài liệu..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={value =>
                  setStatusFilter(value as DocumentModerationStatus)
                }
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Làm mới</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="border-l-muted border-l-4">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments.length ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 p-6">
                {filteredDocuments.map(document => {
                  const allowApprove =
                    document.moderationStatus === 'PENDING' ||
                    document.moderationStatus === 'REJECTED';
                  const allowReject =
                    document.moderationStatus === 'PENDING' ||
                    document.moderationStatus === 'APPROVED';

                  return (
                    <Card
                      key={document.id}
                      className="border-l-muted hover:border-l-primary border-l-4 transition-all hover:shadow-md"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          {/* Document Info */}
                          <div className="flex-1 space-y-3">
                            {/* Title & Status */}
                            <div className="flex items-start gap-2">
                              <FileText className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold">
                                    {document.title}
                                  </h3>
                                  <Badge
                                    variant={statusBadgeVariant(
                                      document.moderationStatus,
                                    )}
                                  >
                                    {statusLabel(document.moderationStatus)}
                                  </Badge>
                                  {!document.isApproved && (
                                    <Badge variant="secondary">
                                      Chưa công khai
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground line-clamp-2 text-sm">
                                  {document.description || 'Chưa có mô tả'}
                                </p>
                              </div>
                            </div>

                            {/* Tags */}
                            {document.tags && document.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {document.tags.slice(0, 5).map(tag => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                                {document.tags.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{document.tags.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Meta Info */}
                            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>
                                  {document.uploader.firstName ||
                                    document.uploader.lastName ||
                                    document.uploader.username ||
                                    'Người dùng'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {formatDateTime(document.createdAt)}
                                </span>
                              </div>
                              {document.aiAnalysis?.summary && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex cursor-help items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                        <span className="text-purple-500">
                                          AI đã phân tích
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-sm">
                                        {document.aiAnalysis.summary}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetail(document.id)}
                              className="w-full lg:w-auto"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Chi tiết
                            </Button>
                            {allowApprove && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(document.id)}
                                disabled={
                                  processing || actionDocumentId === document.id
                                }
                                className="w-full lg:w-auto"
                              >
                                {actionDocumentId === document.id &&
                                processing ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                Duyệt
                              </Button>
                            )}
                            {allowReject && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  startReject({
                                    id: document.id,
                                    title: document.title,
                                  })
                                }
                                disabled={
                                  processing || actionDocumentId === document.id
                                }
                                className="w-full lg:w-auto"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Từ chối
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
                <ShieldCheck className="text-muted-foreground h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Không có tài liệu</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? 'Không tìm thấy tài liệu phù hợp với từ khóa tìm kiếm'
                    : 'Hiện tại không có tài liệu nào trong hàng đợi với trạng thái này'}
                </p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && filteredDocuments.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-4">
                <p className="text-muted-foreground text-sm">
                  Trang {pagination.page} / {pagination.totalPages} • Tổng{' '}
                  {pagination.total} tài liệu
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadQueue(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                  >
                    Trang trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadQueue(pagination.page + 1)}
                    disabled={
                      pagination.page >= pagination.totalPages || loading
                    }
                  >
                    Trang sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.title || 'Chi tiết tài liệu'}
            </DialogTitle>
            <DialogDescription>
              Kiểm tra nội dung và đưa ra quyết định duyệt/từ chối tài liệu.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedDocument ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={statusBadgeVariant(
                      selectedDocument.moderationStatus,
                    )}
                  >
                    {statusLabel(selectedDocument.moderationStatus)}
                  </Badge>
                  {!selectedDocument.isApproved && (
                    <Badge variant="secondary">Chưa công khai</Badge>
                  )}
                  <Badge variant="outline">
                    {selectedDocument.category?.name || 'Không có danh mục'}
                  </Badge>
                </div>

                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Thông tin</TabsTrigger>
                    <TabsTrigger value="ai">Phân tích AI</TabsTrigger>
                    <TabsTrigger value="files">
                      Tệp ({selectedDocument.files.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4">
                    {/* Uploader & Time */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Người đăng
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {(
                                  selectedDocument.uploader.firstName?.charAt(
                                    0,
                                  ) ||
                                  selectedDocument.uploader.username?.charAt(
                                    0,
                                  ) ||
                                  'U'
                                ).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {selectedDocument.uploader.firstName ||
                                  selectedDocument.uploader.lastName ||
                                  selectedDocument.uploader.username ||
                                  'Người dùng'}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {selectedDocument.uploader.email ||
                                  'Không có email'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Thời gian
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-4 w-4" />
                            <span>
                              Tạo: {formatDateTime(selectedDocument.createdAt)}
                            </span>
                          </div>
                          {selectedDocument.moderatedAt && (
                            <div className="text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Xử lý:{' '}
                                {formatDateTime(selectedDocument.moderatedAt)}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Card>
                        <CardContent className="p-4 text-sm">
                          {selectedDocument.description ||
                            'Chưa có mô tả cho tài liệu'}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Previous Rejection */}
                    {(selectedDocument.rejectionReason ||
                      selectedDocument.moderationNotes) && (
                      <div className="space-y-2">
                        <Label>Lịch sử kiểm duyệt</Label>
                        <Card className="border-destructive/50">
                          <CardContent className="space-y-2 p-4 text-sm">
                            {selectedDocument.rejectionReason && (
                              <div>
                                <span className="text-destructive font-medium">
                                  Lý do từ chối:
                                </span>{' '}
                                {selectedDocument.rejectionReason}
                              </div>
                            )}
                            {selectedDocument.moderationNotes && (
                              <div>
                                <span className="font-medium">Ghi chú:</span>{' '}
                                {selectedDocument.moderationNotes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Moderation Notes */}
                    <div className="space-y-3">
                      <Label>Ghi chú kiểm duyệt</Label>
                      <Textarea
                        placeholder="Ghi chú nội bộ hoặc phản hồi gửi cho người đăng..."
                        value={moderationNotes}
                        onChange={event =>
                          setModerationNotes(event.target.value)
                        }
                        rows={3}
                      />
                      <Card>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">
                              Công khai sau khi duyệt
                            </Label>
                            <p className="text-muted-foreground text-xs">
                              Nếu tắt, tài liệu sẽ được duyệt nhưng vẫn riêng tư
                            </p>
                          </div>
                          <Switch
                            checked={publishPublicly}
                            onCheckedChange={setPublishPublicly}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-base">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Phân tích AI
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateAi(selectedDocument.id)}
                        disabled={aiLoading}
                      >
                        {aiLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Chạy AI
                      </Button>
                    </div>

                    {selectedDocument.aiAnalysis ? (
                      <Card>
                        <CardContent className="space-y-4 p-4">
                          <div>
                            <h4 className="mb-2 font-semibold">Tóm tắt</h4>
                            <p className="text-sm">
                              {selectedDocument.aiAnalysis.summary}
                            </p>
                          </div>
                          {selectedDocument.aiAnalysis.keyPoints?.length ? (
                            <div>
                              <h4 className="mb-2 font-semibold">Điểm chính</h4>
                              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                                {selectedDocument.aiAnalysis.keyPoints.map(
                                  point => (
                                    <li key={point}>{point}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          ) : null}
                          <Separator />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Độ tin cậy
                            </span>
                            <Badge variant="secondary">
                              {(
                                (selectedDocument.aiAnalysis.confidence || 0) *
                                100
                              ).toFixed(0)}
                              %
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
                          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                            <Sparkles className="text-muted-foreground h-8 w-8" />
                          </div>
                          <div>
                            <h4 className="mb-1 font-semibold">
                              Chưa có phân tích
                            </h4>
                            <p className="text-muted-foreground text-sm">
                              Nhấn "Chạy AI" để phân tích tài liệu này
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="files" className="space-y-3">
                    {selectedDocument.files.map(file => (
                      <Card key={file.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {file.originalName}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {file.mimeType} •{' '}
                                {formatFileSize(file.fileSize)}
                              </p>
                            </div>
                          </div>
                          {file.secureUrl ? (
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={file.secureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Xem
                              </a>
                            </Button>
                          ) : (
                            <Badge variant="outline">Không thể xem</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Không tìm thấy dữ liệu cho tài liệu này.
            </p>
          )}

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDetailOpen(false)}
              disabled={processing}
            >
              Đóng
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedDocument &&
                startReject({
                  id: selectedDocument.id,
                  title: selectedDocument.title,
                })
              }
              disabled={processing || !selectedDocument}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Từ chối
            </Button>
            <Button
              onClick={() =>
                selectedDocument &&
                handleApprove(selectedDocument.id, {
                  notes: moderationNotes || undefined,
                  publish: publishPublicly,
                })
              }
              disabled={processing || !selectedDocument}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Duyệt tài liệu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="text-destructive h-5 w-5" />
              Từ chối tài liệu
            </DialogTitle>
            <DialogDescription>
              Gửi lý do từ chối để người dùng biết cần chỉnh sửa những gì.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tài liệu</Label>
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">
                    {pendingAction?.title || 'Không xác định'}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-2">
              <Label>
                Lý do <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={event => setRejectReason(event.target.value)}
                placeholder="Nhập lý do từ chối..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú thêm (tùy chọn)</Label>
              <Textarea
                value={rejectNotes}
                onChange={event => setRejectNotes(event.target.value)}
                placeholder="Thông tin bổ sung hoặc hướng dẫn chi tiết..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={processing}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={processing || !rejectReason.trim()}
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
