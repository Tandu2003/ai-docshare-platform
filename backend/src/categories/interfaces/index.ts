import { Category } from '@prisma/client';

export interface CategoryWithParent extends Category {
  readonly parent: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null;
}
export interface CategoryWithMetrics extends CategoryWithParent {
  readonly documentCount: number;
  readonly totalDownloads: number;
  readonly totalViews: number;
}

export interface CategorySuggestion {
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly confidence: number;
  readonly allSuggestions: CategorySuggestionItem[];
}

export interface CategorySuggestionItem {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly color: string | null;
  readonly parentId: string | null;
  readonly score: number;
  readonly confidence: number;
}

export interface CategoryTreeNode {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly color: string | null;
  readonly parentId: string | null;
  readonly isActive: boolean;
  readonly sortOrder: number;
  readonly documentCount: number;
  readonly children: CategoryTreeNode[];
}
