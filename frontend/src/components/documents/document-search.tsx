import { useCallback, useEffect, useState } from 'react';

import { Filter, Search, SortAsc, SortDesc, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category, SearchFilters } from '@/types';
import { getLanguageOptions } from '@/utils/language';

interface DocumentSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isLoading?: boolean;
  categories: Category[];
  onClearFilters: () => void;
}

export function DocumentSearch({
  filters,
  onFiltersChange,
  onSearch,
  isLoading,
  categories,
  onClearFilters,
}: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState(filters.query || '');
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onFiltersChange({
            ...filters,
            query: query.trim() || undefined,
          });
          onSearch();
        }, 300); // 300ms delay
      };
    })(),
    [filters, onFiltersChange, onSearch],
  );

  // Auto search when typing
  useEffect(() => {
    if (searchQuery !== (filters.query || '')) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch, filters.query]);

  // Update local state when filters change externally
  useEffect(() => {
    setSearchQuery(filters.query || '');
  }, [filters.query]);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = filters.categoryId ? [filters.categoryId] : [];
    const newCategories = checked
      ? [...currentCategories, categoryId]
      : currentCategories.filter(id => id !== categoryId);

    onFiltersChange({
      ...filters,
      categoryId: newCategories.length > 0 ? newCategories[0] : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleLanguageChange = (language: string) => {
    onFiltersChange({
      ...filters,
      language: language === 'all' ? undefined : language,
    });
  };

  const handleVisibilityChange = (
    type: 'public' | 'premium' | 'private',
    checked: boolean,
  ) => {
    const newFilters = { ...filters };

    if (type === 'public') {
      newFilters.isPublic = checked ? true : undefined;
    } else if (type === 'premium') {
      newFilters.isPremium = checked ? true : undefined;
    } else if (type === 'private') {
      newFilters.isPublic = checked ? false : undefined;
    }

    onFiltersChange(newFilters);
  };

  const handleMinRatingChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minRating: value[0] > 0 ? value[0] : undefined,
    });
  };

  const popularTags = [
    'javascript',
    'react',
    'typescript',
    'nodejs',
    'python',
    'ai',
    'machine-learning',
    'data-science',
  ];
  const languageOptions = getLanguageOptions();

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
      // Trigger immediate search on Enter
      onFiltersChange({
        ...filters,
        query: searchQuery.trim() || undefined,
      });
      onSearch();
    }
  };

  const handleSortChange = (sortBy: string) => {
    const [field, order] = sortBy.split('-');
    onFiltersChange({
      ...filters,
      sortBy: field as any,
      sortOrder: order as 'asc' | 'desc',
    });
  };

  const sortOptions = [
    { value: 'relevance-desc', label: 'Liên quan nhất' },
    { value: 'date-desc', label: 'Mới nhất trước' },
    { value: 'date-asc', label: 'Cũ nhất trước' },
    { value: 'rating-desc', label: 'Đánh giá cao nhất' },
    { value: 'rating-asc', label: 'Đánh giá thấp nhất' },
    { value: 'downloads-desc', label: 'Tải nhiều nhất' },
    { value: 'downloads-asc', label: 'Tải ít nhất' },
    { value: 'views-desc', label: 'Xem nhiều nhất' },
    { value: 'views-asc', label: 'Xem ít nhất' },
  ];

  const currentSortValue = `${filters.sortBy || 'relevance'}-${filters.sortOrder || 'desc'}`;

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
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="mr-1 h-4 w-4" />
                Xóa
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="mr-1 h-4 w-4" />
              {isExpanded ? 'Ẩn' : 'Hiển thị'} bộ lọc
            </Button>
          </div>
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
                onChange={e => setSearchQuery(e.target.value)}
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

          <div>
            <Label className="text-sm font-medium">Sắp xếp theo</Label>
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {filters.sortOrder === 'asc' ? (
                        <SortAsc className="h-3 w-3" />
                      ) : (
                        <SortDesc className="h-3 w-3" />
                      )}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Status */}
        {filters.query && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" />
            <span>Đang tìm kiếm:</span>
            <span className="text-foreground font-medium">
              "{filters.query}"
            </span>
            {isLoading && (
              <div className="border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"></div>
            )}
          </div>
        )}

        {/* Filters */}
        {isExpanded && (
          <div className="space-y-6 border-t pt-6">
            {/* Categories */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Danh mục</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {categories.slice(0, 6).map(category => (
                  <div
                    key={category.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={filters.categoryId === category.id}
                      onCheckedChange={checked =>
                        handleCategoryChange(category.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="flex items-center gap-1 text-sm"
                    >
                      <span>{category.icon}</span>
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Thẻ</Label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={
                      filters.tags?.includes(tag) ? 'default' : 'outline'
                    }
                    className="hover:bg-primary/10 cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Language, Visibility and Rating */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Ngôn ngữ</Label>
                <Select
                  value={filters.language || 'all'}
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngôn ngữ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả ngôn ngữ</SelectItem>
                    {languageOptions.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Hiển thị</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="public"
                      checked={filters.isPublic === true}
                      onCheckedChange={checked =>
                        handleVisibilityChange('public', checked as boolean)
                      }
                    />
                    <Label htmlFor="public" className="text-sm">
                      Công khai
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="premium"
                      checked={filters.isPremium === true}
                      onCheckedChange={checked =>
                        handleVisibilityChange('premium', checked as boolean)
                      }
                    />
                    <Label htmlFor="premium" className="text-sm">
                      Premium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="private"
                      checked={filters.isPublic === false}
                      onCheckedChange={checked =>
                        handleVisibilityChange('private', checked as boolean)
                      }
                    />
                    <Label htmlFor="private" className="text-sm">
                      Riêng tư
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Đánh giá tối thiểu
                </Label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleMinRatingChange([rating])}
                      className={`text-2xl transition-colors ${
                        rating <= (filters.minRating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-muted-foreground ml-2 text-sm">
                    {filters.minRating || 0} sao
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
