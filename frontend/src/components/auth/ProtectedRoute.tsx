import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks';
import { useCan } from '@/lib/casl';

import { RequireAuth } from './RequireAuth';

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
  requireAuth = true,
  requiredAction,
  requiredSubject,
  requiredConditions,
  message,
  requiredActionText,
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <RequireAuth
        message={message || 'Bạn cần đăng nhập để truy cập tính năng này'}
        requiredAction={requiredActionText || 'truy cập trang này'}
      />
    );
  }

  // If auth is not required but user is authenticated (for login/register pages)
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If specific permissions are required, check them using CASL
  if (requiredAction && requiredSubject) {
    const canAccess = useCan(requiredAction, requiredSubject, requiredConditions);

    if (!canAccess) {
      return (
        <RequireAuth
          message={message || `Bạn không có quyền ${requiredAction} ${requiredSubject}`}
          requiredAction={requiredActionText || `${requiredAction} ${requiredSubject}`}
        />
      );
    }
  }

  return <>{children}</>;
};
