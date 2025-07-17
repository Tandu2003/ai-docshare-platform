import { Navigate, createBrowserRouter } from 'react-router-dom';

import { MainLayout, ProtectedRoute } from '../components/layout';
import {
  DashboardPage,
  ForgotPasswordPage,
  LoginPage,
  NotFoundPage,
  RegisterPage,
  ResendVerificationPage,
  ResetPasswordPage,
  UnauthorizedPage,
  VerifyEmailPage,
} from '../pages';

export const router = createBrowserRouter([
  // Redirect root to dashboard
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Navigate to="/dashboard" replace />
      </ProtectedRoute>
    ),
  },

  // Public auth routes (redirect to dashboard if already logged in)
  {
    path: '/auth/login',
    element: (
      <ProtectedRoute requireAuth={false}>
        <LoginPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/register',
    element: (
      <ProtectedRoute requireAuth={false}>
        <RegisterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/forgot-password',
    element: (
      <ProtectedRoute requireAuth={false}>
        <ForgotPasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/reset-password',
    element: (
      <ProtectedRoute requireAuth={false}>
        <ResetPasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/verify-email',
    element: (
      <ProtectedRoute requireAuth={false}>
        <VerifyEmailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/resend-verification',
    element: (
      <ProtectedRoute requireAuth={false}>
        <ResendVerificationPage />
      </ProtectedRoute>
    ),
  },

  // Legacy routes for compatibility
  {
    path: '/login',
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: '/register',
    element: <Navigate to="/auth/register" replace />,
  },
  {
    path: '/forgot-password',
    element: <Navigate to="/auth/forgot-password" replace />,
  },
  {
    path: '/reset-password',
    element: <Navigate to="/auth/reset-password" replace />,
  },
  {
    path: '/verify-email',
    element: <Navigate to="/auth/verify-email" replace />,
  },
  {
    path: '/resend-verification',
    element: <Navigate to="/auth/resend-verification" replace />,
  },

  // Main app layout with nested routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'documents',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">Documents Page - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'upload',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">Upload Page - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'profile',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">Profile Page - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'settings',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">Settings Page - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requiredRole="admin">
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Admin Dashboard - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Error pages
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
