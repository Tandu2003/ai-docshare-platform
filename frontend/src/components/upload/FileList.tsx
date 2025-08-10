import { Download, ExternalLink, FileText, MoreHorizontal, Search, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { UploadedFile, UploadService } from '@/services/upload.service'

interface FileListProps {
  refreshTrigger?: number;
  onFileDeleted?: (fileId: string) => void;
  className?: string;
}

export const FileList: React.FC<FileListProps> = ({ refreshTrigger, onFileDeleted, className }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [mimeTypeFilter, setMimeTypeFilter] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 20;

  const loadFiles = async (pageNum: number = 1, search: string = '', mimeType: string = '') => {
    try {
      setLoading(true);
      setError(null);

      const response = await UploadService.getUserFiles(pageNum, limit, mimeType || undefined);

      // Filter by search term on frontend (could be moved to backend)
      let filteredFiles = response.files;
      if (search) {
        filteredFiles = response.files.filter((file) =>
          file.originalName.toLowerCase().includes(search.toLowerCase())
        );
      }

      setFiles(filteredFiles);
      setTotal(response.total);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(1, searchTerm, mimeTypeFilter);
  }, [refreshTrigger, searchTerm, mimeTypeFilter]);

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      setDeletingId(fileId);
      await UploadService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      onFileDeleted?.(fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const downloadUrl = await UploadService.getDownloadUrl(file.id);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate download link');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const mimeTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'application/pdf', label: 'PDF' },
    { value: 'image/', label: 'Images' },
    { value: 'text/', label: 'Text Files' },
    { value: 'application/msword', label: 'Word Documents' },
    { value: 'application/vnd.ms-excel', label: 'Excel Files' },
  ];

  if (loading && files.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
            My Files ({total})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFiles(page, searchTerm, mimeTypeFilter)}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardTitle>

        {/* Search and Filter */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={mimeTypeFilter}
            onChange={(e) => setMimeTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {mimeTypeOptions.map((option) => (
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
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No files found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{UploadService.getFileIcon(file.mimeType)}</span>
                  </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{file.originalName}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{UploadService.formatFileSize(file.fileSize)}</span>
                    <span>{formatDate(file.createdAt)}</span>
                    <Badge variant={file.isPublic ? 'default' : 'secondary'} className="text-xs">
                      {file.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(file)}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={() => window.open(file.filePath, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === file.id ? 'Deleting...' : 'Delete'}
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
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} files
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadFiles(page - 1, searchTerm, mimeTypeFilter)}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadFiles(page + 1, searchTerm, mimeTypeFilter)}
                disabled={page * limit >= total || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
