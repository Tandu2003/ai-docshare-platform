import React, { useEffect, useState } from 'react';

import {
  Bot,
  Download,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentsService, type Document } from '@/services/files.service';
import { formatDate } from '@/utils/date';

interface DocumentListProps {
  refreshTrigger?: number;
  onDocumentDeleted?: (documentId: string) => void;
  className?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  refreshTrigger,
  onDocumentDeleted,
  className,
}) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 10;

  const loadDocuments = async (pageNum: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);

      // Use real API to fetch user's documents
      const response = await DocumentsService.getUserDocuments(pageNum, limit);

      // Client-side filtering for search (until backend supports search)
      let filteredDocuments = response.documents;
      if (search) {
        filteredDocuments = response.documents.filter(
          document =>
            document.title?.toLowerCase().includes(search.toLowerCase()) ||
            document.description?.toLowerCase().includes(search.toLowerCase()),
        );
      }

      setDocuments(filteredDocuments);
      setTotal(response.total);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments(1, searchTerm);
  }, [refreshTrigger]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      loadDocuments(1, searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  const handleDownload = async (document: Document) => {
    try {
      // Use real API to download document
      await DocumentsService.downloadDocument(document.id);
    } catch (err) {
      setError('Failed to download document');
      console.error('Error downloading document:', err);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setDeletingId(documentId);

      // Use real API to delete document
      await DocumentsService.deleteDocument(documentId);

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setTotal(prev => prev - 1);

      // Notify parent component
      onDocumentDeleted?.(documentId);
    } catch (err) {
      setError('Failed to delete document');
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDocumentClick = async (documentId: string) => {
    // Track view before navigating
    const document = documents.find(doc => doc.id === documentId);
    if (document?.isPublic && document?.isApproved) {
      await DocumentsService.trackDocumentView(
        documentId,
        window.location.href,
      );
    }
    navigate(`/documents/${documentId}`);
  };

  const getDocumentIcon = (document: Document) => {
    // Get file extension from filename or title
    const filename = document.title || '';
    const extension = filename.split('.').pop()?.toLowerCase();

    // Return appropriate icon based on file type
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <FileImage className="h-6 w-6 text-blue-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'flv':
      case 'webm':
        return <FileVideo className="h-6 w-6 text-purple-500" />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <FileAudio className="h-6 w-6 text-green-500" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FileArchive className="h-6 w-6 text-orange-500" />;
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
        return <FileText className="h-6 w-6 text-red-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getTotalFileSize = (document: Document) => {
    // Calculate total file size from document files
    if (document.files && document.files.length > 0) {
      return document.files.reduce((total, file) => {
        const fileSize =
          typeof file.fileSize === 'string'
            ? parseInt(file.fileSize, 10)
            : file.fileSize;
        return total + (fileSize || 0);
      }, 0);
    }
    return 0;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && documents.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                <Skeleton className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
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
            My Documents ({total})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDocuments(page, searchTerm)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>

        {/* Search */}
        <div className="mt-4 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description={
              searchTerm
                ? 'No documents match your search criteria.'
                : "You haven't uploaded any documents yet."
            }
          />
        ) : (
          <div className="space-y-3">
            {documents.map(document => (
              <div
                key={document.id}
                className="hover:bg-muted/50 group flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors"
                onClick={() => handleDocumentClick(document.id)}
              >
                {/* Document Icon/Preview */}
                <div className="flex-shrink-0">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                    {getDocumentIcon(document)}
                  </div>
                </div>

                {/* Document Info */}
                <div className="min-w-0 flex-1">
                  <h4 className="group-hover:text-primary truncate font-medium transition-colors">
                    {document.title}
                  </h4>
                  <div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
                    <span>{formatFileSize(getTotalFileSize(document))}</span>
                    <span>{formatDate(document.createdAt)}</span>
                    <span>{document.category?.name}</span>
                    <Badge
                      variant={document.isPublic ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {document.isPublic ? 'Public' : 'Private'}
                    </Badge>
                    {/* Moderation Info */}
                    {document.moderatedAt && (
                      <div className="flex items-center gap-1">
                        {document.moderatedById ? (
                          <UserCheck className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Bot className="h-3 w-3 text-green-600" />
                        )}
                        <span className="text-xs">
                          {document.moderatedById ? 'Admin' : 'AI'}
                        </span>
                      </div>
                    )}
                  </div>
                  {document.description && (
                    <p className="text-muted-foreground mt-1 truncate text-sm">
                      {document.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(document)}
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
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(document.id)}
                        disabled={deletingId === document.id}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === document.id ? 'Deleting...' : 'Delete'}
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
            <p className="text-muted-foreground text-sm">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total} documents
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadDocuments(page - 1, searchTerm)}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadDocuments(page + 1, searchTerm)}
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
