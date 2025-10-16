import { useCallback, useEffect, useState } from 'react';

import { DocumentGrid } from '@/components/documents/document-grid';
import { DocumentsService, type Document } from '@/services/files.service';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchDocuments = useCallback(async (pageNum = 1, reset = false) => {
    if (reset) {
      setLoading(true);
    }

    try {
      // Use real API to fetch public documents
      const response = await DocumentsService.getPublicDocuments(pageNum, 12);

      if (reset) {
        setDocuments(response.documents);
      } else {
        setDocuments(prev => [...prev, ...response.documents]);
      }

      // Check if there are more pages
      const totalPages = Math.ceil(response.total / 12);
      setHasMore(pageNum < totalPages);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      // Fallback to empty array on error
      if (reset) {
        setDocuments([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(nextPage, false);
  };

  useEffect(() => {
    // Load initial documents
    fetchDocuments(1, true);
  }, [fetchDocuments]);

  // Note: Filter functionality will be implemented when backend supports search/filtering
  // For now, we'll fetch all public documents

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tài liệu</h1>
        <p className="text-muted-foreground">
          Duyệt và khám phá tài liệu được chia sẻ bởi cộng đồng.
        </p>
      </div>

      {/* Lưới tài liệu */}
      <DocumentGrid
        documents={documents}
        isLoading={loading}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
      />
    </div>
  );
}
