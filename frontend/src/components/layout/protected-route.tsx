import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks';
import { usePermissions } from '@/hooks/use-permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: Array<{
    action: string;
    subject: string;
    conditions?: any;
  }>;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredPermissions,
  requiredRole,
  fallback,
}) => {
  const { isAuthenticated, hasRole } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If auth is not required but user is authenticated (for login/register pages)
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check required permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission =>
      can(permission.action, permission.subject, permission.conditions),
    );

    if (!hasAllPermissions) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <Navigate to="/unauthorized" replace />
      );
    }
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback ? <>{fallback}</> : <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
