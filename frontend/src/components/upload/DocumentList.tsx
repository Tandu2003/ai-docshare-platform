import { Download, FileText, MoreHorizontal, Search, Trash2 } from 'lucide-react';

import React, { useEffect, useState } from 'react';

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
import { Document, DocumentsService } from '@/services/files.service';

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

      const response = await DocumentsService.getUserDocuments(pageNum, limit);
      console.log({ response });
      // Filter by search term on frontend if provided
      let filteredDocuments = response.documents;
      if (search) {
        filteredDocuments = response.documents.filter((document) =>
          document.title?.toLowerCase().includes(search.toLowerCase())
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
      setLoading(true);
      await DocumentsService.downloadDocument(document.id);
    } catch (err) {
      setError('Failed to download document');
      console.error('Error downloading document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      setDeletingId(documentId);
      await DocumentsService.deleteDocument(documentId);

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
    // Return icon based on first file's mime type or default
    if (document.files && document.files.length > 0) {
      const firstFile = document.files[0];
      const mimeType = firstFile.mimeType;

      if (mimeType?.includes('pdf')) return '📄';
      if (mimeType?.includes('image')) return '🖼️';
      if (mimeType?.includes('video')) return '🎥';
      if (mimeType?.includes('audio')) return '🎵';
      if (mimeType?.includes('word')) return '📝';
      if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
      if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📊';
    }
    return '📄'; // Default document icon
  };

  const getTotalFileSize = (document: Document) => {
    if (!document.files || document.files.length === 0) return 0;
    return document.files.reduce((total, file) => total + (file.fileSize || 0), 0);
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
            My Documents ({total})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDocuments(page, searchTerm)}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardTitle>

        {/* Search */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No documents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Document Icon/Preview */}
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{getDocumentIcon(document)}</span>
                  </div>
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{document.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{formatFileSize(getTotalFileSize(document))}</span>
                    <span>{formatDate(document.createdAt)}</span>
                    <span>{document.files?.length || 0} files</span>
                    <Badge
                      variant={document.isPublic ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {document.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  {document.description && (
                    <p className="text-sm text-gray-600 mt-1 truncate">{document.description}</p>
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
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={() => handleDownload(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(document.id)}
                        disabled={deletingId === document.id}
                        className="text-red-600"
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
            <p className="text-sm text-gray-500">
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
