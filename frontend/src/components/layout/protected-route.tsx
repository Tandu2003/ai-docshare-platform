import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string; // Simplified RBAC: only check a single required role (e.g. 'admin')
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  fallback,
}) => {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Require authentication
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect authenticated users away from auth pages
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Role gating (admin-only sections, etc.)
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback ? <>{fallback}</> : <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
