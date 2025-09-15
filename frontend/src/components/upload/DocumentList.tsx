import { Download, FileText, MoreHorizontal, RefreshCw, Search, Trash2 } from 'lucide-react';

import React, { useEffect, useState } from 'react';

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
import { mockDocuments } from '@/services/mock-data.service';
import type { Document } from '@/types';

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

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Filter mock documents by search term
      let filteredDocuments = mockDocuments;
      if (search) {
        filteredDocuments = mockDocuments.filter(
          (document) =>
            document.title?.toLowerCase().includes(search.toLowerCase()) ||
            document.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Pagination
      const startIndex = (pageNum - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

      setDocuments(paginatedDocuments);
      setTotal(filteredDocuments.length);
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
      // Simulate download
      console.log('Downloading document:', document.title);
      // In real app, this would trigger actual download
    } catch (err) {
      setError('Failed to download document');
      console.error('Error downloading document:', err);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setDeletingId(documentId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove from local state
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setTotal((prev) => prev - 1);

      // Notify parent component
      onDocumentDeleted?.(documentId);
    } catch (err) {
      setError('Failed to delete document');
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDocumentIcon = (document: Document) => {
    // Return icon based on category or default
    return document.category?.icon || '📄';
  };

  const getTotalFileSize = (_document: Document) => {
    // Mock file size calculation
    return Math.floor(Math.random() * 10000000) + 1000000; // 1MB to 10MB
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
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-lg" />
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
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Document Icon/Preview */}
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{getDocumentIcon(document)}</span>
                  </div>
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{document.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(getTotalFileSize(document))}</span>
                    <span>{formatDate(document.createdAt.toString())}</span>
                    <span>{document.category?.name}</span>
                    <Badge
                      variant={document.isPublic ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {document.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  {document.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {document.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
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
                      <DropdownMenuItem onClick={() => handleDownload(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(document.id)}
                        disabled={deletingId === document.id}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
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
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
              documents
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
