import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermissions?: string[];
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredPermissions,
  requiredRole,
}) => {
  const { isAuthenticated, hasPermission, hasRole } = useAuth();
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
    const hasAllPermissions = requiredPermissions.every((permission) => hasPermission(permission));

    if (!hasAllPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
