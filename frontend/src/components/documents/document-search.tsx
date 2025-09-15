import { Filter, Search, SortAsc, SortDesc, X } from 'lucide-react';

import { useState } from 'react';

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

  const handleSearch = () => {
    onFiltersChange({
      ...filters,
      query: searchQuery.trim() || undefined,
    });
    onSearch();
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = filters.categoryId ? [filters.categoryId] : [];
    const newCategories = checked
      ? [...currentCategories, categoryId]
      : currentCategories.filter((id) => id !== categoryId);

    onFiltersChange({
      ...filters,
      categoryId: newCategories.length > 0 ? newCategories[0] : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
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

  const handleVisibilityChange = (type: 'public' | 'premium' | 'private', checked: boolean) => {
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

  const activeFiltersCount = Object.values(filters).filter(
    (value) =>
      value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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
    { value: 'relevance-desc', label: 'Most Relevant' },
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'rating-desc', label: 'Highest Rated' },
    { value: 'rating-asc', label: 'Lowest Rated' },
    { value: 'downloads-desc', label: 'Most Downloaded' },
    { value: 'downloads-asc', label: 'Least Downloaded' },
    { value: 'views-desc', label: 'Most Viewed' },
    { value: 'views-asc', label: 'Least Viewed' },
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
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              <Filter className="h-4 w-4 mr-1" />
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-sm font-medium">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents, tags, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Sort by</Label>
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
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

        {/* Search Button */}
        <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto">
          <Search className="h-4 w-4 mr-2" />
          {isLoading ? 'Searching...' : 'Search'}
        </Button>

        {/* Search Suggestions */}
        {filters.query && (
          <div className="text-sm text-muted-foreground">
            Searching for: <span className="font-medium">"{filters.query}"</span>
          </div>
        )}

        {/* Filters */}
        {isExpanded && (
          <div className="space-y-6 border-t pt-6">
            {/* Categories */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Categories</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.slice(0, 6).map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={filters.categoryId === category.id}
                      onCheckedChange={(checked) =>
                        handleCategoryChange(category.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="text-sm flex items-center gap-1"
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
              <Label className="text-sm font-medium">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Language, Visibility and Rating */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Language</Label>
                <Select value={filters.language || 'all'} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Visibility</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="public"
                      checked={filters.isPublic === true}
                      onCheckedChange={(checked) =>
                        handleVisibilityChange('public', checked as boolean)
                      }
                    />
                    <Label htmlFor="public" className="text-sm">
                      Public
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="premium"
                      checked={filters.isPremium === true}
                      onCheckedChange={(checked) =>
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
                      onCheckedChange={(checked) =>
                        handleVisibilityChange('private', checked as boolean)
                      }
                    />
                    <Label htmlFor="private" className="text-sm">
                      Private
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Minimum Rating</Label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
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
                  <span className="text-sm text-muted-foreground ml-2">
                    {filters.minRating || 0} stars
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
