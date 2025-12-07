import { useEffect, useState } from 'react';

import { useAppDispatch } from '@/hooks';
import { store } from '@/store';
import {
  clearAccessToken,
  handleAutoLogout,
  initializeAuth,
  setAccessToken,
} from '@/store/slices';
import { apiClient } from '@/utils/api-client';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Connect API client to Redux store
        apiClient.connectToRedux(
          (token: string) => dispatch(setAccessToken(token)),
          () => dispatch(clearAccessToken()),
          () => store.getState().auth.accessToken || null,
        );

        // Initialize auth state on app startup
        await dispatch(initializeAuth());
      } catch (error) {
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [dispatch]);

  // Note: TokenManager synchronization is now handled via the getTokenFromStore callback
  // passed to connectToRedux, so no manual sync is needed

  // Listen for automatic logout events from API client
  useEffect(() => {
    const handleLogout = () => {
      dispatch(handleAutoLogout());
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [dispatch]);

  // Show loading while initializing auth
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Đang khởi tạo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
