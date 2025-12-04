import React, { useEffect, useState } from 'react';

import {
  ExternalLink,
  FileText,
  MoreHorizontal,
  Search,
  Trash2,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { UploadedFile, UploadService } from '@/services/upload.service';

interface FileListProps {
  refreshTrigger?: number;
  onFileDeleted?: (fileId: string) => void;
  className?: string;
}

export const FileList: React.FC<FileListProps> = ({
  refreshTrigger,
  onFileDeleted,
  className,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [mimeTypeFilter, setMimeTypeFilter] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 20;

  const loadFiles = async (
    pageNum: number = 1,
    search: string = '',
    mimeType: string = '',
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UploadService.getUserFiles(
        pageNum,
        limit,
        mimeType || undefined,
      );

      // Filter by search term on frontend (could be moved to backend)
      let filteredFiles = response.files;
      if (search) {
        filteredFiles = response.files.filter(file =>
          file.originalName?.toLowerCase().includes(search.toLowerCase()),
        );
      }

      setFiles(filteredFiles);
      setTotal(response.total);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tệp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(1, searchTerm, mimeTypeFilter);
  }, [refreshTrigger, searchTerm, mimeTypeFilter]);

  const handleDelete = async (fileId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tệp này không?')) return;

    try {
      setDeletingId(fileId);
      await UploadService.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      onFileDeleted?.(fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa tệp');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const mimeTypeOptions = [
    { value: '', label: 'Tất cả loại' },
    { value: 'application/pdf', label: 'PDF' },
    { value: 'image/', label: 'Hình ảnh' },
    { value: 'text/', label: 'Tệp văn bản' },
    { value: 'application/msword', label: 'Tài liệu Word' },
    { value: 'application/vnd.ms-excel', label: 'Tệp Excel' },
  ];

  if (loading && files.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tài liệu của tôi ({total})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFiles(page, searchTerm, mimeTypeFilter)}
            disabled={loading}
          >
            Làm mới
          </Button>
        </CardTitle>

        {/* Search and Filter */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Tìm kiếm tài liệu..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={mimeTypeFilter}
            onChange={e => setMimeTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {mimeTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {files.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">Không tìm thấy tài liệu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-gray-50"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                    <span className="text-2xl">
                      {UploadService.getFileIcon(file.mimeType)}
                    </span>
                  </div>
                </div>

                {/* Document Info */}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-medium">{file.originalName}</h4>
                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                    <span>{UploadService.formatFileSize(file.fileSize)}</span>
                    <span>{formatDate(file.createdAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      {file.secureUrl && (
                        <DropdownMenuItem
                          onClick={() => window.open(file.secureUrl, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Xem tài liệu
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === file.id ? 'Đang xóa...' : 'Xóa'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {(page - 1) * limit + 1} đến{' '}
              {Math.min(page * limit, total)} trong tổng số {total} tài liệu
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadFiles(page - 1, searchTerm, mimeTypeFilter)}
                disabled={page <= 1 || loading}
              >
                Trang trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadFiles(page + 1, searchTerm, mimeTypeFilter)}
                disabled={page * limit >= total || loading}
              >
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
