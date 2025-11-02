import { useCallback, useEffect, useState } from 'react';

import { DocumentGrid } from '@/components/documents/document-grid';
import { DocumentSearch } from '@/components/documents/document-search';
import { DocumentsService, type Document } from '@/services/files.service';
import type { SearchFilters } from '@/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search filters state
  const [filters, setFilters] = useState<SearchFilters>({
    query: undefined,
    categoryId: undefined,
    tags: undefined,
    language: undefined,
    sortBy: 'relevance',
    sortOrder: 'desc',
  });

  const fetchDocuments = useCallback(
    async (pageNum = 1, reset = false, currentFilters?: SearchFilters) => {
      const activeFilters = currentFilters || filters;
      if (reset) {
        setLoading(true);
      }

      try {
        // If there's a search query, use search API
        if (activeFilters.query && activeFilters.query.trim()) {
          const response = await DocumentsService.searchDocuments(
            activeFilters.query.trim(),
            pageNum,
            12,
            {
              categoryId: activeFilters.categoryId,
              tags: activeFilters.tags,
              language: activeFilters.language,
            },
          );

          if (reset) {
            setDocuments(response.documents);
          } else {
            setDocuments(prev => [...prev, ...response.documents]);
          }

          // Check if there are more pages
          const totalPages = Math.ceil(response.total / 12);
          setHasMore(pageNum < totalPages);
        } else {
          // No search query, fetch public documents normally
          const response = await DocumentsService.getPublicDocuments(
            pageNum,
            12,
          );

          if (reset) {
            setDocuments(response.documents);
          } else {
            setDocuments(prev => [...prev, ...response.documents]);
          }

          // Check if there are more pages
          const totalPages = Math.ceil(response.total / 12);
          setHasMore(pageNum < totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        // Fallback to empty array on error
        if (reset) {
          setDocuments([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(nextPage, false);
  };

  const handleSearch = useCallback(
    (nextFilters: SearchFilters) => {
      setPage(1);
      fetchDocuments(1, true, nextFilters);
    },
    [fetchDocuments],
  );

  useEffect(() => {
    // Load initial documents
    fetchDocuments(1, true);
  }, []); // Only run on mount

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tài liệu</h1>
        <p className="text-muted-foreground">
          Duyệt và khám phá tài liệu được chia sẻ bởi cộng đồng. Tìm kiếm với AI
          Vector Search để có kết quả chính xác hơn.
        </p>
      </div>

      {/* Search & Filters */}
      <DocumentSearch
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        isLoading={loading}
      />

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
