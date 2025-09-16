import { useCallback, useEffect, useState } from 'react';

import { DocumentGrid } from '@/components/documents/document-grid';
import { DocumentSearch } from '@/components/documents/document-search';
import { mockCategories, mockDocuments } from '@/services/mock-data.service';
import type { Category, Document, SearchFilters } from '@/types';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<SearchFilters>({
    query: undefined,
    categoryId: undefined,
    tags: undefined,
    language: undefined,
    isPublic: undefined,
    isPremium: undefined,
    isApproved: undefined,
    difficulty: undefined,
    minRating: undefined,
    sortBy: 'relevance',
    sortOrder: 'desc',
  });

  const fetchDocuments = useCallback(
    async (pageNum = 1, reset = false) => {
      if (reset) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }

      try {
        // Simulate API call with filters
        await new Promise((resolve) => setTimeout(resolve, 800));

        let filteredDocs = [...mockDocuments];

        // Apply filters
        if (filters.query) {
          const query = filters.query.toLowerCase();
          filteredDocs = filteredDocs.filter(
            (doc) =>
              doc.title.toLowerCase().includes(query) ||
              doc.description?.toLowerCase().includes(query) ||
              doc.tags.some((tag) => tag.toLowerCase().includes(query)) ||
              doc.category.name.toLowerCase().includes(query)
          );
        }

        if (filters.categoryId) {
          filteredDocs = filteredDocs.filter((doc) => doc.categoryId === filters.categoryId);
        }

        if (filters.tags && filters.tags.length > 0) {
          filteredDocs = filteredDocs.filter((doc) =>
            filters.tags!.some((tag) => doc.tags.includes(tag))
          );
        }

        if (filters.language) {
          filteredDocs = filteredDocs.filter((doc) => doc.language === filters.language);
        }

        if (filters.isPublic !== undefined) {
          filteredDocs = filteredDocs.filter((doc) => doc.isPublic === filters.isPublic);
        }

        if (filters.isPremium !== undefined) {
          filteredDocs = filteredDocs.filter((doc) => doc.isPremium === filters.isPremium);
        }

        if (filters.isApproved !== undefined) {
          filteredDocs = filteredDocs.filter((doc) => doc.isApproved === filters.isApproved);
        }

        if (filters.minRating !== undefined) {
          filteredDocs = filteredDocs.filter((doc) => doc.averageRating >= filters.minRating!);
        }

        // Apply sorting
        filteredDocs.sort((a, b) => {
          const field = filters.sortBy || 'relevance';
          const order = filters.sortOrder || 'desc';

          let aValue: any, bValue: any;

          switch (field) {
            case 'date':
              aValue = new Date(a.createdAt).getTime();
              bValue = new Date(b.createdAt).getTime();
              break;
            case 'rating':
              aValue = a.averageRating;
              bValue = b.averageRating;
              break;
            case 'downloads':
              aValue = a.downloadCount;
              bValue = b.downloadCount;
              break;
            case 'views':
              aValue = a.viewCount;
              bValue = b.viewCount;
              break;
            default:
              // Relevance - simple text matching score
              aValue = filters.query
                ? a.title.toLowerCase().includes(filters.query.toLowerCase())
                  ? 1
                  : 0
                : 0;
              bValue = filters.query
                ? b.title.toLowerCase().includes(filters.query.toLowerCase())
                  ? 1
                  : 0
                : 0;
              break;
          }

          if (order === 'asc') {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        });

        // Pagination
        const pageSize = 12;
        const startIndex = (pageNum - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageDocs = filteredDocs.slice(startIndex, endIndex);

        if (reset) {
          setDocuments(pageDocs);
        } else {
          setDocuments((prev) => [...prev, ...pageDocs]);
        }

        setHasMore(endIndex < filteredDocs.length);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setLoading(false);
        setSearchLoading(false);
      }
    },
    [filters]
  );

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
    // Trigger search immediately when filters change
    fetchDocuments(1, true);
  };

  const handleClearFilters = () => {
    setFilters({
      query: undefined,
      categoryId: undefined,
      tags: undefined,
      language: undefined,
      isPublic: undefined,
      isPremium: undefined,
      isApproved: undefined,
      difficulty: undefined,
      minRating: undefined,
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
    fetchDocuments(1, true);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(nextPage, false);
  };

  useEffect(() => {
    // Load categories
    setCategories(mockCategories);
    // Load initial documents
    fetchDocuments(1, true);
  }, []);

  useEffect(() => {
    // Refetch when filters change
    if (page === 1) {
      fetchDocuments(1, true);
    }
  }, [filters]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Browse and discover documents shared by the community.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-6">
        <DocumentSearch
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          isLoading={searchLoading}
          categories={categories}
          onClearFilters={handleClearFilters}
        />

        {/* Documents Grid */}
        <DocumentGrid
          documents={documents}
          isLoading={loading}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}
