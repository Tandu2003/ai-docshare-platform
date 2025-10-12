import { TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { DashboardCategory } from '@/types';

interface PopularCategoriesProps {
  categories: DashboardCategory[];
}

export function PopularCategories({ categories }: PopularCategoriesProps) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Popular Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No category data available.</p>
        </CardContent>
      </Card>
    );
  }

  const maxDocuments = Math.max(...categories.map((cat) => cat.documentCount));
  const denominator = maxDocuments > 0 ? maxDocuments : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon ?? '📄'}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>{category.documentCount} documents</span>
                </div>
              </div>
              <Progress value={(category.documentCount / denominator) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{category.totalDownloads} downloads</span>
                <span>{category.totalViews} views</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
