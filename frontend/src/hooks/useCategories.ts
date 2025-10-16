import { useCallback, useEffect, useState } from 'react';

import {
  fetchCategories,
  fetchPublicCategories,
} from '@/services/category.service';
import type { CategoryWithStats } from '@/types';

import { usePermissions } from './usePermissions';

interface UseCategoriesReturn {
  categories: CategoryWithStats[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook để load categories dựa trên quyền của user
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { canManageCategories } = usePermissions();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Sử dụng endpoint phù hợp dựa trên quyền
      const data = canManageCategories
        ? await fetchCategories()
        : await fetchPublicCategories();

      setCategories(data);
    } catch (fetchError) {
      console.error('Failed to fetch categories:', fetchError);
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Không thể tải danh mục';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canManageCategories]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    refetch: loadCategories,
  };
}
