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

interface UseAuthReturn {
  auth: ReturnType<typeof selectAuth>;
  user: ReturnType<typeof selectUser>;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (loginData: LoginDto) => Promise<unknown>;
  register: (registerData: RegisterDto) => Promise<unknown>;
  logout: () => Promise<unknown>;
  fetchCurrentUser: () => Promise<unknown>;
  hasPermission: (action: string, subject: string, conditions?: Record<string, unknown>) => boolean;
  hasRole: (roleName: string) => boolean;
  isAdmin: () => boolean;
}

export const useAuth = (): UseAuthReturn => {
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

  const hasPermission = useCallback(
    (action: string, subject: string, conditions?: Record<string, unknown>): boolean => {
      if (!user?.role?.permissions) return false;

      return user.role.permissions.some((p: unknown) => {
        if (typeof p === 'string') {
          return p === action || p === 'manage';
        }

        if (
          p &&
          typeof p === 'object' &&
          'action' in p &&
          'subject' in p &&
          typeof p.action === 'string' &&
          typeof p.subject === 'string'
        ) {
          const permission = p as {
            action: string;
            subject: string;
            conditions?: Record<string, unknown>;
          };

          const matchesAction = permission.action === action;
          if (!matchesAction) return false;

          const matchesSubject =
            permission.subject.toLowerCase() === subject.toLowerCase();
          if (!matchesSubject) return false;

          if (conditions && permission.conditions) {
            return Object.keys(conditions).every(
              key => permission.conditions![key] === conditions[key],
            );
          }

          return true;
        }

        return false;
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
