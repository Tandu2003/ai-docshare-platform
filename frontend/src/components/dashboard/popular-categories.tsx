import { TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { Progress } from '@/components/ui/progress';
import type { DashboardCategory } from '@/types';

interface PopularCategoriesProps {
  categories: DashboardCategory[];
  isLoading?: boolean;
}

export function PopularCategories({ categories, isLoading = false }: PopularCategoriesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Danh mục phổ biến</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Danh mục phổ biến</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Không có dữ liệu danh mục.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxDocuments = Math.max(...categories.map(cat => cat.documentCount));
  const denominator = maxDocuments > 0 ? maxDocuments : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map(category => (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon ?? '📄'}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                  <TrendingUp className="h-3 w-3" />
                  <span>{category.documentCount} tài liệu</span>
                </div>
              </div>
              <Progress
                value={(category.documentCount / denominator) * 100}
                className="h-2"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>{category.totalDownloads} lượt tải</span>
                <span>{category.totalViews} lượt xem</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
