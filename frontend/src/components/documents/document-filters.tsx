import { Filter, X } from 'lucide-react';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { Category, DocumentFilters } from '@/types';
import { getLanguageOptions } from '@/utils/language';

interface DocumentFiltersProps {
  categories: Category[];
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  onClearFilters: () => void;
}

export function DocumentFilters({
  categories,
  filters,
  onFiltersChange,
  onClearFilters,
}: DocumentFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleApprovalChange = (approved: boolean, checked: boolean) => {
    onFiltersChange({
      ...filters,
      isApproved: checked ? approved : undefined,
    });
  };

  const handleDifficultyChange = (difficulty: string) => {
    onFiltersChange({
      ...filters,
      difficulty: difficulty === 'all' ? undefined : difficulty,
    });
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
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const activeFiltersCount = Object.values(filters).filter(
    (value) =>
      value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Bộ lọc
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
                Xóa
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? 'Thu gọn' : 'Mở rộng'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isExpanded ? 'space-y-6' : 'space-y-4'}>
        {/* Categories */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Danh mục</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {categories.map((category) => (
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
                  className="text-sm flex items-center gap-2"
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

        {/* Language */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Ngôn ngữ</Label>
          <Select value={filters.language || 'all'} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn ngôn ngữ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả ngôn ngữ</SelectItem>
              {languageOptions.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visibility */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Hiển thị</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={filters.isPublic === true}
                onCheckedChange={(checked) => handleVisibilityChange('public', checked as boolean)}
              />
              <Label htmlFor="public" className="text-sm">
                Công khai
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="premium"
                checked={filters.isPremium === true}
                onCheckedChange={(checked) => handleVisibilityChange('premium', checked as boolean)}
              />
              <Label htmlFor="premium" className="text-sm">
                Premium
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={filters.isPublic === false}
                onCheckedChange={(checked) => handleVisibilityChange('private', checked as boolean)}
              />
              <Label htmlFor="private" className="text-sm">
                Riêng tư
              </Label>
            </div>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Approval Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Trạng thái duyệt</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="approved"
                    checked={filters.isApproved === true}
                    onCheckedChange={(checked) => handleApprovalChange(true, checked as boolean)}
                  />
                  <Label htmlFor="approved" className="text-sm">
                    Đã duyệt
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pending"
                    checked={filters.isApproved === false}
                    onCheckedChange={(checked) => handleApprovalChange(false, checked as boolean)}
                  />
                  <Label htmlFor="pending" className="text-sm">
                    Đang chờ
                  </Label>
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Độ khó</Label>
              <Select value={filters.difficulty || 'all'} onValueChange={handleDifficultyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn độ khó" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả cấp độ</SelectItem>
                  {difficulties.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Đánh giá tối thiểu: {filters.minRating || 0} sao
              </Label>
              <Slider
                value={[filters.minRating || 0]}
                onValueChange={handleMinRatingChange}
                max={5}
                min={0}
                step={0.5}
                className="w-full"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
