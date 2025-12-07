import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FolderOpen,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { DocumentGrid } from '@/components/documents/document-grid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchCategoryDetail,
  type CategoryDetailResponse,
} from '@/services/categories.service';
import { Document } from '@/services/files.service';

type SortField = 'createdAt' | 'downloadCount' | 'viewCount' | 'averageRating';
type SortOrder = 'asc' | 'desc';

export function CategoryDetailPage(): ReactElement | null {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<CategoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & sorting from URL params
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  const sort = (searchParams.get('sort') || 'createdAt') as SortField;
  const order = (searchParams.get('order') || 'desc') as SortOrder;

  const updateParams = (updates: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      newParams.set(key, String(value));
    });
    setSearchParams(newParams);
  };

  const loadCategoryDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCategoryDetail(id, {
        page,
        limit,
        sort,
        order,
      });
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải chi tiết danh mục',
      );
    } finally {
      setLoading(false);
    }
  }, [id, page, limit, sort, order]);

  useEffect(() => {
    void loadCategoryDetail();
  }, [loadCategoryDetail]);

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage });
  };

  const handleSortChange = (newSort: SortField) => {
    updateParams({ sort: newSort, page: 1 });
  };

  const handleOrderChange = () => {
    updateParams({ order: order === 'asc' ? 'desc' : 'asc', page: 1 });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-32 w-full" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Đã xảy ra lỗi</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void loadCategoryDetail()}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const { category, documents, pagination } = data;
  const categoryColor = category.color || '#3b82f6';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/categories"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh mục
      </Link>

      {/* Category Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg text-3xl"
            style={{
              backgroundColor: `${categoryColor}20`,
              color: categoryColor,
            }}
          >
            {category.icon || '📁'}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: categoryColor }}>
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {category.description}
              </p>
            )}
            {category.parent && (
              <p className="text-muted-foreground mt-1 text-sm">
                Danh mục cha:{' '}
                <Link
                  to={`/categories/${category.parent.id}`}
                  className="hover:underline"
                >
                  {category.parent.icon} {category.parent.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{category.documentCount} tài liệu</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{category.totalViews.toLocaleString()} lượt xem</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>{category.totalDownloads.toLocaleString()} lượt tải</span>
          </div>
        </div>
      </div>

      {/* Sub-categories */}
      {category.children && category.children.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Danh mục con</h2>
          <div className="flex flex-wrap gap-2">
            {category.children.map(child => (
              <Link key={child.id} to={`/categories/${child.id}`}>
                <Badge
                  variant="secondary"
                  className="hover:bg-secondary/80 cursor-pointer"
                  style={{
                    backgroundColor: `${child.color || categoryColor}20`,
                    color: child.color || categoryColor,
                  }}
                >
                  {child.icon} {child.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sorting controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Hiển thị {documents.length} / {pagination.total} tài liệu
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={sort}
            onValueChange={v => handleSortChange(v as SortField)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sắp xếp theo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Ngày tạo</SelectItem>
              <SelectItem value="downloadCount">Lượt tải</SelectItem>
              <SelectItem value="viewCount">Lượt xem</SelectItem>
              <SelectItem value="averageRating">Đánh giá</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleOrderChange}>
            {order === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Documents Grid - using shared DocumentGrid component */}
      <DocumentGrid
        documents={documents as Document[]}
        isLoading={false}
        hasMore={false}
      />

      {/* Empty State */}
      {documents.length === 0 && !loading && (
        <div className="text-muted-foreground py-12 text-center">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Chưa có tài liệu nào trong danh mục này</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Trang trước
          </Button>
          <span className="text-muted-foreground text-sm">
            Trang {pagination.page} / {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.pages}
            onClick={() => handlePageChange(page + 1)}
          >
            Trang sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
