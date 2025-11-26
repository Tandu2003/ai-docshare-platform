import { useCallback } from 'react';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  selectAccessToken,
  selectAuth,
  selectIsAuthenticated,
  selectIsLoading,
  selectUser,
} from '@/store/slices';
import type { LoginDto, RegisterDto } from '@/types';

import { useAppDispatch, useAppSelector } from './use-redux';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const accessToken = useAppSelector(selectAccessToken);

  // Actions
  const login = useCallback(
    async (loginData: LoginDto) => {
      const result = await dispatch(loginUser(loginData));
      return result;
    },
    [dispatch],
  );

  const register = useCallback(
    async (registerData: RegisterDto) => {
      const result = await dispatch(registerUser(registerData));
      return result;
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    const result = await dispatch(logoutUser());
    return result;
  }, [dispatch]);

  const fetchCurrentUser = useCallback(async () => {
    const result = await dispatch(getCurrentUser());
    return result;
  }, [dispatch]);

  // Simple role helpers
  const hasPermission = useCallback(
    (action: string, subject: string, conditions?: any): boolean => {
      if (!user?.role?.permissions) return false;

      // Handle both Permission[] and string[] formats
      return user.role.permissions.some((p: any) => {
        // If permissions are strings, check if action is in the string
        if (typeof p === 'string') {
          return p === action || p === 'manage';
        }

        // If permissions are Permission objects
        const matchesAction = p.action === action;
        if (!matchesAction) return false;

        // Compare case-insensitively; backend subjects are PascalCase
        const matchesSubject =
          typeof p.subject === 'string' &&
          p.subject.toLowerCase() === subject.toLowerCase();

        if (!matchesSubject) return false;

        // Check conditions if provided
        if (conditions && p.conditions) {
          return Object.keys(conditions).every(
            key => p.conditions![key] === conditions[key],
          );
        }

        return true;
      });
    },
    [user],
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      return user?.role?.name === roleName;
    },
    [user],
  );

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  return {
    // State
    auth,
    user,
    isAuthenticated,
    isLoading,
    accessToken,

    // Actions
    login,
    register,
    logout,
    fetchCurrentUser,

    // Permission helpers
    hasPermission,
    hasRole,
    isAdmin,
  };
};
