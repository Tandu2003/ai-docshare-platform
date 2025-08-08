import { useEffect, useState } from 'react';

import { useAppDispatch } from '@/hooks';
import { initializeAuth } from '@/store/slices';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth state on app startup
        await dispatch(initializeAuth());
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [dispatch]);

  // Show loading while initializing auth
  if (isInitializing) {
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
