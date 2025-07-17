import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { initializeAuth, selectIsLoading } from '@/store/slices';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectIsLoading);

  useEffect(() => {
    // Initialize auth state on app startup
    dispatch(initializeAuth());
  }, [dispatch]);

  // Show loading while initializing auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang khởi tạo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
