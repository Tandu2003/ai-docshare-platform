import { useCallback, useEffect, useState, type ReactElement } from 'react';

import {
  AlertCircle,
  CheckCircle,
  FolderTree,
  Loader2,
  Sparkles,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  fetchCategorySuggestions,
  fetchPublicCategories,
  type CategorySuggestion,
  type CategorySummary,
} from '@/services/categories.service';

interface CategorySelectorProps {
  documentId?: string; // For AI suggestions after document is created
  value?: string; // Currently selected category ID
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  showAiSuggestions?: boolean;
  className?: string;
  required?: boolean; // Whether category selection is required
}

export function CategorySelector({
  documentId,
  value,
  onChange,
  disabled = false,
  showAiSuggestions = true,
  className,
}: CategorySelectorProps): ReactElement {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        setLoadingCategories(true);
        const data = await fetchPublicCategories();
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh mục');
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  // Load AI suggestions when documentId is provided
  const loadSuggestions = useCallback(async () => {
    if (!documentId || !showAiSuggestions) return;

    try {
      setLoadingSuggestions(true);
      setError(null);
      const response = await fetchCategorySuggestions(documentId);
      setSuggestions(response.suggestions);
    } catch (err) {
      // Don't show error for suggestions - it's a nice-to-have feature
    } finally {
      setLoadingSuggestions(false);
    }
  }, [documentId, showAiSuggestions]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const selectedCategory = categories.find(c => c.id === value);

  // Build hierarchical categories for display
  const rootCategories = categories.filter(c => !c.parentId);
  const getChildren = (parentId: string) =>
    categories.filter(c => c.parentId === parentId);

  if (loadingCategories) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error && categories.length === 0) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main category selector */}
      <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Chọn danh mục">
            {selectedCategory && (
              <span className="flex items-center gap-2">
                <span>{selectedCategory.icon || '📁'}</span>
                <span>{selectedCategory.name}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {rootCategories.map(category => (
            <div key={category.id}>
              <SelectItem value={category.id}>
                <span className="flex items-center gap-2">
                  <span>{category.icon || '📁'}</span>
                  <span style={{ color: category.color || undefined }}>
                    {category.name}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {category.documentCount}
                  </Badge>
                </span>
              </SelectItem>
              {/* Children */}
              {getChildren(category.id).map(child => (
                <SelectItem key={child.id} value={child.id} className="pl-8">
                  <span className="flex items-center gap-2">
                    <span>{child.icon || '📁'}</span>
                    <span style={{ color: child.color || undefined }}>
                      {child.name}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {child.documentCount}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      {/* AI Suggestions */}
      {showAiSuggestions && documentId && (
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span>Gợi ý từ AI</span>
            </div>
            {loadingSuggestions && (
              <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            )}
          </div>

          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map(suggestion => (
                <Button
                  key={suggestion.id}
                  variant={value === suggestion.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange(suggestion.id)}
                  disabled={disabled}
                  className="h-auto py-1"
                >
                  <span className="mr-1">{suggestion.icon || '📁'}</span>
                  <span
                    style={{
                      color:
                        value === suggestion.id
                          ? undefined
                          : suggestion.color || undefined,
                    }}
                  >
                    {suggestion.name}
                  </span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {suggestion.confidence}%
                  </Badge>
                </Button>
              ))}
            </div>
          ) : !loadingSuggestions ? (
            <p className="text-muted-foreground text-xs">
              Không có gợi ý danh mục phù hợp
            </p>
          ) : null}
        </div>
      )}

      {/* Selected category info */}
      {selectedCategory && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>
            Đã chọn: {selectedCategory.name} ({selectedCategory.documentCount}{' '}
            tài liệu)
          </span>
        </div>
      )}
    </div>
  );
}

interface AICategorySuggestionsProps {
  documentId: string;
  currentCategoryId?: string;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
}

export function AICategorySuggestions({
  documentId,
  currentCategoryId,
  onSelectCategory,
  className,
}: AICategorySuggestionsProps): ReactElement {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchCategorySuggestions(documentId);
      setSuggestions(response.suggestions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải gợi ý danh mục',
      );
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 p-4', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Đang phân tích tài liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadSuggestions()}
          >
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div
        className={cn(
          'text-muted-foreground p-4 text-center text-sm',
          className,
        )}
      >
        <FolderTree className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>Không tìm thấy gợi ý danh mục phù hợp</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">Gợi ý danh mục từ AI</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map(suggestion => {
          const isSelected = suggestion.id === currentCategoryId;
          return (
            <button
              key={suggestion.id}
              onClick={() => onSelectCategory(suggestion.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50 hover:bg-muted/50',
              )}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md text-xl"
                style={{
                  backgroundColor: `${suggestion.color || '#3b82f6'}20`,
                }}
              >
                {suggestion.icon || '📁'}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-medium"
                  style={{ color: suggestion.color || undefined }}
                >
                  {suggestion.name}
                </p>
                <div className="flex items-center gap-2">
                  <div className="bg-muted h-1.5 flex-1 rounded-full">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${suggestion.confidence}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {suggestion.confidence}%
                  </span>
                </div>
              </div>
              {isSelected && <CheckCircle className="text-primary h-5 w-5" />}
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => void loadSuggestions()}
        className="w-full"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Phân tích lại
      </Button>
    </div>
  );
}
