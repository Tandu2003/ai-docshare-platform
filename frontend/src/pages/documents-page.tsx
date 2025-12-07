import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { DocumentGrid } from '@/components/documents/document-grid';
import { DocumentSearch } from '@/components/documents/document-search';
import { DocumentsService, type Document } from '@/services/files.service';
import type { SearchFilters } from '@/types';
// Helper to parse filters from URL
function parseFiltersFromUrl(searchParams: URLSearchParams): SearchFilters {
  return {
    query: searchParams.get('q') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    language: searchParams.get('language') || undefined,
    sortBy:
      (searchParams.get('sortBy') as SearchFilters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  };
}

// Helper to sync filters to URL
function syncFiltersToUrl(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set('q', filters.query);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.tags && filters.tags.length > 0)
    params.set('tags', filters.tags.join(','));
  if (filters.language) params.set('language', filters.language);
  if (filters.sortBy && filters.sortBy !== 'createdAt')
    params.set('sortBy', filters.sortBy);
  if (filters.sortOrder && filters.sortOrder !== 'desc')
    params.set('sortOrder', filters.sortOrder);

  return params;
}

export function DocumentsPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Track if we're updating URL programmatically to avoid double fetch
  const isUpdatingUrl = useRef(false);

  // Initialize filters from URL
  const [filters, setFilters] = useState<SearchFilters>(() =>
    parseFiltersFromUrl(searchParams),
  );

  // Use ref to store filters for fetchDocuments to avoid dependency issues
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchDocuments = useCallback(
    async (pageNum = 1, reset = false, currentFilters?: SearchFilters) => {
      const activeFilters = currentFilters || filtersRef.current;
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
              sortBy: activeFilters.sortBy,
              sortOrder: activeFilters.sortOrder,
            },
          );

          if (!response || !response.documents) {
            if (reset) {
              setDocuments([]);
            }
            setHasMore(false);
            return;
          }

          if (reset) {
            setDocuments(response.documents);
          } else {
            setDocuments(prev => [...prev, ...response.documents]);
          }

          // Check if there are more pages
          const totalPages = Math.ceil(response.total / 12);
          setHasMore(pageNum < totalPages);
        } else {
          // No search query, fetch public documents with filters
          const response = await DocumentsService.getPublicDocuments(
            pageNum,
            12,
            {
              categoryId: activeFilters.categoryId,
              sortBy: activeFilters.sortBy,
              sortOrder: activeFilters.sortOrder,
            },
          );

          if (!response || !response.documents) {
            if (reset) {
              setDocuments([]);
            }
            setHasMore(false);
            return;
          }

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
        // Fallback to empty array on error
        if (reset) {
          setDocuments([]);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(nextPage, false);
  };

  const handleSearch = useCallback(
    (nextFilters: SearchFilters) => {
      setPage(1);
      setFilters(nextFilters);
      // Mark that we're updating URL programmatically
      isUpdatingUrl.current = true;
      // Update URL with new filters
      setSearchParams(syncFiltersToUrl(nextFilters));
      fetchDocuments(1, true, nextFilters);
    },
    [fetchDocuments, setSearchParams],
  );

  // Sync filters when URL changes (e.g., browser back/forward)
  useEffect(() => {
    // Skip if we're updating URL programmatically (from handleSearch)
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false;
      return;
    }

    const urlFilters = parseFiltersFromUrl(searchParams);
    setFilters(urlFilters);
    // Refetch documents when URL changes (e.g., browser back/forward)
    setPage(1);
    fetchDocuments(1, true, urlFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Removed separate mount effect - URL sync effect handles initial load

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
