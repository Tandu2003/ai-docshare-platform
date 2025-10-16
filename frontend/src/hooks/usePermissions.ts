import { useMemo } from 'react';

import { useSelector } from 'react-redux';

import type { RootState } from '@/store';
import type { Permission } from '@/types';

interface UsePermissionsReturn {
  canCreateCategory: boolean;
  canUpdateCategory: boolean;
  canDeleteCategory: boolean;
  canManageCategories: boolean;
  isAdmin: boolean;
  hasPermission: (action: string, subject: string) => boolean;
}

/**
 * Hook để kiểm tra quyền của user hiện tại
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const permissions = useMemo((): UsePermissionsReturn => {
    if (!isAuthenticated || !user?.role) {
      return {
        canCreateCategory: false,
        canUpdateCategory: false,
        canDeleteCategory: false,
        canManageCategories: false,
        isAdmin: false,
        hasPermission: () => false,
      };
    }

    const userRole = user.role.name.toLowerCase();
    const isAdmin = userRole === 'admin';

    // Kiểm tra quyền quản lý categories - chỉ admin
    const canManageCategories = isAdmin;
    const canCreateCategory = canManageCategories;
    const canUpdateCategory = canManageCategories;
    const canDeleteCategory = canManageCategories;

    // Helper function để kiểm tra permission cụ thể
    const hasPermission = (action: string, subject: string): boolean => {
      // Admin có toàn quyền
      if (isAdmin) {
        return true;
      }

      // Kiểm tra permissions từ role
      if (user.role.permissions) {
        return user.role.permissions.some(
          (permission: Permission) =>
            permission.action.toLowerCase() === action.toLowerCase() &&
            (permission.subject.toLowerCase() === subject.toLowerCase() ||
              permission.subject === 'all'),
        );
      }

      return false;
    };

    return {
      canCreateCategory,
      canUpdateCategory,
      canDeleteCategory,
      canManageCategories,
      isAdmin,
      hasPermission,
    };
  }, [user, isAuthenticated]);

  return permissions;
}
