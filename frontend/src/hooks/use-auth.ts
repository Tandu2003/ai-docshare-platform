import { useCallback } from 'react';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  selectAuth,
  selectIsAuthenticated,
  selectIsLoading,
  selectUser,
} from '../store/slices';
import type { LoginDto, RegisterDto } from '../types';
import { useAppDispatch, useAppSelector } from './use-redux';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);

  // Actions
  const login = useCallback(
    async (loginData: LoginDto) => {
      const result = await dispatch(loginUser(loginData));
      return result;
    },
    [dispatch]
  );

  const register = useCallback(
    async (registerData: RegisterDto) => {
      const result = await dispatch(registerUser(registerData));
      return result;
    },
    [dispatch]
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
    (permission: string): boolean => {
      if (!user?.role?.permissions) return false;
      return user.role.permissions.includes(permission);
    },
    [user]
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      return user?.role?.name === roleName;
    },
    [user]
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
