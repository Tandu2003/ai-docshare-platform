import { useCallback, useEffect, useRef, useState } from 'react';

import { Layers, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SearchFilters } from '@/types';

interface DocumentSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

export function DocumentSearch({
  filters,
  onFiltersChange,
  onSearch,
  isLoading,
}: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState(filters.query || '');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSearch = useCallback(
    (nextFilters: SearchFilters, immediate = false) => {
      onFiltersChange(nextFilters);

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }

      if (immediate) {
        onSearch(nextFilters);
        return;
      }

      searchTimerRef.current = setTimeout(() => {
        onSearch(nextFilters);
      }, 300);
    },
    [onFiltersChange, onSearch],
  );

  useEffect(
    () => () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setSearchQuery(filters.query || '');
  }, [filters.query]);

  // Count only meaningful filters (excluding default values)
  const activeFiltersCount = (() => {
    let count = 0;

    // Query filter
    if (filters.query && filters.query.trim()) count++;

    // Category filter
    if (filters.categoryId) count++;

    // Tags filter
    if (filters.tags && filters.tags.length > 0) count++;

    // Language filter
    if (filters.language) count++;

    // Visibility filters
    if (filters.isPublic !== undefined) count++;
    if (filters.isPremium !== undefined) count++;

    // Rating filter
    if (filters.minRating && filters.minRating > 0) count++;

    // Sort filter (only if not default)
    if (filters.sortBy && filters.sortBy !== 'relevance') count++;

    return count;
  })();

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const nextFilters: SearchFilters = {
        ...filters,
        query: searchQuery.trim() || undefined,
      };
      scheduleSearch(nextFilters, true);
    }
  };

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);

    const trimmed = value.trim();
    if ((filters.query || '') === trimmed) {
      return;
    }

    const nextFilters: SearchFilters = {
      ...filters,
      query: trimmed || undefined,
    };

    scheduleSearch(nextFilters, false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label className="text-sm font-medium">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Tìm kiếm tài liệu, thẻ, hoặc danh mục..."
                value={searchQuery}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
              {isLoading && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                  <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                </div>
              )}
            </div>
            {searchQuery && !isLoading && (
              <p className="text-muted-foreground mt-1 text-xs">
                Tự động tìm kiếm khi bạn nhập...
              </p>
            )}
          </div>
        </div>

        {/* Search Mode Indicator */}
        {filters.query && (
          <div className="border-primary/40 bg-primary/5 text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-sm">
            <Layers className="text-primary h-4 w-4" />
            <span>
              Đang sử dụng chế độ tìm kiếm kết hợp (AI embeddings + từ khóa) để
              trả về kết quả chính xác hơn.
            </span>
          </div>
        )}

        {/* Search Status */}
        {filters.query && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            <span>Đang tìm kiếm:</span>
            <span className="text-foreground font-medium">
              "{filters.query}"
            </span>
            <Badge variant="secondary" className="ml-2">
              Chế độ AI kết hợp
            </Badge>
            {isLoading && (
              <div className="border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"></div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
