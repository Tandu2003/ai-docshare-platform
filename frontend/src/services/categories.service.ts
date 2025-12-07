import { Document } from '@/services/files.service';
import { apiClient } from '@/utils/api-client';
export interface CategorySummary {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  isActive: boolean;
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  } | null;
}

export interface CategoryChild {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export interface CategoryDetailResponse {
  category: CategorySummary & {
    children: CategoryChild[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  documents: Document[];
}

export interface CategorySuggestion {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  score: number;
  confidence: number;
}

export interface CategorySuggestionsResponse {
  documentId: string;
  currentCategoryId: string;
  suggestions: CategorySuggestion[];
  basis: {
    documentTags: string[];
    aiSuggestedTags: string[];
  };
}

export async function fetchCategories(
  includeInactive = true,
): Promise<CategorySummary[]> {
  const response = await apiClient.get<CategorySummary[]>('/categories', {
    params: { includeInactive },
  });
  return response.data ?? [];
}

export async function fetchPublicCategories(): Promise<CategorySummary[]> {
  const response = await apiClient.get<CategorySummary[]>('/categories/public');
  return response.data ?? [];
}

export async function fetchCategoryDetail(
  id: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'downloadCount' | 'viewCount' | 'averageRating';
    order?: 'asc' | 'desc';
  },
): Promise<CategoryDetailResponse> {
  const response = await apiClient.get<CategoryDetailResponse>(
    `/categories/${id}`,
    { params },
  );
  if (!response.data) {
    throw new Error('Failed to load category details');
  }
  return response.data;
}

export async function fetchCategorySuggestions(
  documentId: string,
): Promise<CategorySuggestionsResponse> {
  const response = await apiClient.post<CategorySuggestionsResponse>(
    `/categories/suggest-for-document/${documentId}`,
  );
  if (!response.data) {
    throw new Error('Failed to get category suggestions');
  }
  return response.data;
}

export async function createCategory(data: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<CategorySummary> {
  const response = await apiClient.post<CategorySummary>('/categories', data);
  if (!response.data) {
    throw new Error('Failed to create category');
  }
  return response.data;
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    parentId?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<CategorySummary> {
  const response = await apiClient.patch<CategorySummary>(
    `/categories/${id}`,
    data,
  );
  if (!response.data) {
    throw new Error('Failed to update category');
  }
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
