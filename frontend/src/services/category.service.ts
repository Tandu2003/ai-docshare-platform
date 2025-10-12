import { apiClient } from '@/utils/api-client';
import type { CategoryWithStats } from '@/types';

interface CategoryApiResponse {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  isActive: boolean;
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryListResponse extends Array<CategoryApiResponse> {}

export interface CategoryPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryPayload = Partial<CategoryPayload>;

const mapCategory = (category: CategoryApiResponse): CategoryWithStats => ({
  id: category.id,
  name: category.name,
  description: category.description ?? undefined,
  icon: category.icon ?? undefined,
  color: category.color ?? undefined,
  parentId: category.parentId ?? undefined,
  isActive: category.isActive,
  documentCount: category.documentCount ?? 0,
  totalDownloads: category.totalDownloads ?? 0,
  totalViews: category.totalViews ?? 0,
  sortOrder: category.sortOrder,
  createdAt: new Date(category.createdAt),
  updatedAt: new Date(category.updatedAt),
});

const serializePayload = (payload: CategoryPayload | UpdateCategoryPayload) => {
  const serialized: Record<string, unknown> = { ...payload };

  if ('parentId' in serialized) {
    const parentIdValue = serialized.parentId;

    if (typeof parentIdValue === 'string') {
      const trimmedParentId = parentIdValue.trim();
      serialized.parentId = trimmedParentId.length > 0 ? trimmedParentId : null;
    } else if (parentIdValue === undefined) {
      delete serialized.parentId;
    }
  }

  if ('description' in serialized && typeof serialized.description === 'string') {
    serialized.description = serialized.description.trim();
  }

  if ('name' in serialized && typeof serialized.name === 'string') {
    serialized.name = serialized.name.trim();
  }

  return serialized;
};

export const fetchCategories = async (
  includeInactive = true
): Promise<CategoryWithStats[]> => {
  const response = await apiClient.get<CategoryListResponse>('/categories', {
    params: { includeInactive },
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải danh sách danh mục');
  }

  return response.data.map(mapCategory);
};

export const createCategory = async (
  payload: CategoryPayload
): Promise<CategoryWithStats> => {
  const response = await apiClient.post<CategoryApiResponse>(
    '/categories',
    serializePayload(payload)
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tạo danh mục mới');
  }

  return mapCategory(response.data);
};

export const updateCategory = async (
  id: string,
  payload: UpdateCategoryPayload
): Promise<CategoryWithStats> => {
  const response = await apiClient.patch<CategoryApiResponse>(
    `/categories/${id}`,
    serializePayload(payload)
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể cập nhật danh mục');
  }

  return mapCategory(response.data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const response = await apiClient.delete(`/categories/${id}`);

  if (!response.success) {
    throw new Error(response.message || 'Không thể xóa danh mục');
  }
};
