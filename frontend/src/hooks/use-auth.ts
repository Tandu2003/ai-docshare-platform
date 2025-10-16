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

  // Permission helpers
  const hasPermission = useCallback(
    (permissionOrAction: string, subject?: string): boolean => {
      if (!user?.role?.permissions) return false;

      // Support signature: hasPermission('action:subject') or hasPermission('action', 'Subject')
      const [actionFromString, subjectFromString] =
        subject === undefined && permissionOrAction.includes(':')
          ? permissionOrAction.split(':', 2)
          : [permissionOrAction, subject];

      const action = actionFromString?.trim();
      const normalizedSubject = subjectFromString?.trim();

      return user.role.permissions.some(p => {
        const matchesAction = p.action === action;
        if (!matchesAction) return false;
        if (!normalizedSubject) return true;
        // Compare case-insensitively; backend subjects are PascalCase
        return (
          typeof p.subject === 'string' &&
          p.subject.toLowerCase() === normalizedSubject.toLowerCase()
        );
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

  const isModerator = useCallback((): boolean => {
    return hasRole('moderator') || hasRole('admin');
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
    isModerator,
  };
};
