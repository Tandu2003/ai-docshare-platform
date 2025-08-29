import { Navigate } from 'react-router-dom';

import { useAuth } from '@/hooks';
import { useCan } from '@/lib/casl';

import { RequireAuth } from '../auth/RequireAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredAction?: string;
  requiredSubject?: string;
  requiredConditions?: Record<string, any>;
  message?: string;
  requiredActionText?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requiredAction,
  requiredSubject,
  requiredConditions,
  message,
  requiredActionText,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Debug logging
  console.log('🔐 ProtectedRoute Debug:', {
    requiredAction,
    requiredSubject,
    requiredConditions,
    isAuthenticated,
    user: user
      ? `${user.firstName} ${user.lastName} (${user.role?.name || 'no-role'})`
      : 'not authenticated',
    isLoading,
    message: `Checking ${requiredAction}:${requiredSubject}`,
  });

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // For now, simplify: if user is authenticated, allow access
  // We'll implement proper CASL checks later
  if (requiredAction && requiredSubject) {
    if (!isAuthenticated) {
      console.log('🚫 Access denied: User not authenticated');
      return (
        <RequireAuth
          message={
            message ||
            `Bạn cần đăng nhập để ${requiredActionText || requiredAction} ${requiredSubject}`
          }
          requiredAction={requiredActionText || `${requiredAction} ${requiredSubject}`}
        />
      );
    }

    console.log('✅ Access granted: User authenticated');

    // TODO: Implement proper CASL permission checks here
    // For now, all authenticated users can access everything
  }

  // If auth is not required but user is authenticated (for login/register pages)
  if (!requireAuth && isAuthenticated && requiredAction === undefined) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
