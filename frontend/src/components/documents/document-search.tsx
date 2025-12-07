import { useCallback, useEffect, useRef, useState } from 'react';

import { ArrowDownAZ, ArrowUpAZ, FolderOpen, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CategorySummary,
  fetchPublicCategories,
} from '@/services/categories.service';
import type { SearchFilters } from '@/types';

interface DocumentSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Ngày tạo' },
  { value: 'downloadCount', label: 'Lượt tải' },
  { value: 'viewCount', label: 'Lượt xem' },
  { value: 'averageRating', label: 'Đánh giá' },
  { value: 'title', label: 'Tiêu đề' },
];

export function DocumentSearch({
  filters,
  onFiltersChange,
  onSearch,
  isLoading,
}: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState(filters.query || '');
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load categories on mount - only show categories with documents
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchPublicCategories();
        // Filter to only show categories that have documents
        const categoriesWithDocuments = data.filter(
          cat => cat.documentCount > 0,
        );
        setCategories(categoriesWithDocuments);
      } catch (error) {
      }
    };
    loadCategories();
  }, []);

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

    // Sort filter (only if not default)
    if (filters.sortBy && filters.sortBy !== 'createdAt') count++;

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
    const currentQuery = (filters.query || '').trim();

    // Only skip if the trimmed values are exactly the same
    // This prevents unnecessary API calls when the query hasn't actually changed
    if (currentQuery === trimmed) {
      return;
    }

    const nextFilters: SearchFilters = {
      ...filters,
      query: trimmed || undefined,
    };

    scheduleSearch(nextFilters, false);
  };

  const handleCategoryChange = (value: string) => {
    const nextFilters: SearchFilters = {
      ...filters,
      categoryId: value === 'all' ? undefined : value,
    };
    scheduleSearch(nextFilters, true);
  };

  const handleSortByChange = (value: string) => {
    const nextFilters: SearchFilters = {
      ...filters,
      sortBy: value as SearchFilters['sortBy'],
    };
    scheduleSearch(nextFilters, true);
  };

  const handleSortOrderToggle = () => {
    const nextFilters: SearchFilters = {
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    };
    scheduleSearch(nextFilters, true);
  };

  const handleClearFilters = () => {
    const nextFilters: SearchFilters = {
      query: undefined,
      categoryId: undefined,
      tags: undefined,
      language: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    setSearchQuery('');
    scheduleSearch(nextFilters, true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tìm kiếm & Lọc
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div>
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

        {/* Filter Section - Always visible */}
        <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
          {/* Category Filter */}
          <div>
            <Label className="text-sm font-medium">Danh mục</Label>
            <Select
              value={filters.categoryId || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Tất cả danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Tất cả danh mục
                  </span>
                </SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      <span>{category.icon || '📁'}</span>
                      {category.name}
                      <span className="text-muted-foreground text-xs">
                        ({category.documentCount})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-sm font-medium">Sắp xếp theo</Label>
            <Select
              value={filters.sortBy || 'createdAt'}
              onValueChange={handleSortByChange}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Label className="text-sm font-medium">Thứ tự</Label>
            <Button
              variant="outline"
              className="mt-1 w-full justify-start"
              onClick={handleSortOrderToggle}
            >
              {filters.sortOrder === 'asc' ? (
                <>
                  <ArrowUpAZ className="mr-2 h-4 w-4" />
                  Tăng dần
                </>
              ) : (
                <>
                  <ArrowDownAZ className="mr-2 h-4 w-4" />
                  Giảm dần
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.categoryId ||
          (filters.sortBy && filters.sortBy !== 'createdAt')) && (
          <div className="flex flex-wrap gap-2">
            {filters.categoryId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>
                  {categories.find(c => c.id === filters.categoryId)?.icon ||
                    '📁'}
                </span>
                {categories.find(c => c.id === filters.categoryId)?.name ||
                  'Đang tải...'}
                <button
                  onClick={() => handleCategoryChange('all')}
                  className="hover:text-destructive ml-1"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.sortBy && filters.sortBy !== 'createdAt' && (
              <Badge variant="outline" className="flex items-center gap-1">
                Sắp xếp:{' '}
                {SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label}
              </Badge>
            )}
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
