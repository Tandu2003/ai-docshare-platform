import { Navigate, createBrowserRouter } from 'react-router-dom';

import { MainLayout, ProtectedRoute } from '@/components/layout';
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
} from '@/pages';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import CategoriesPage from '@/pages/CategoriesPage';
import DocumentDetailPage from '@/pages/DocumentDetailPage';
import DocumentsPage from '@/pages/DocumentsPage';
import MyDocumentsPage from '@/pages/MyDocumentsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import { UploadPage } from '@/pages/UploadPage';

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
        element: <DocumentsPage />,
      },
      {
        path: 'documents/:documentId',
        element: <DocumentDetailPage />,
      },
      {
        path: 'upload',
        element: <UploadPage />,
      },
      {
        path: 'categories',
        element: <CategoriesPage />,
      },
      {
        path: 'search',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">Advanced Search - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'bookmarks',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">Bookmarks - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'my-documents',
        element: <MyDocumentsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'settings',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">Settings Page - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'analytics',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">Analytics - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'trending',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">Trending Documents - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'top-rated',
        element: (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-lg">Top Rated Documents - Coming Soon</p>
          </div>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute requiredRole="admin">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-lg">User Management - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <ProtectedRoute requiredRole="admin">
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-lg">System Settings - Coming Soon</p>
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
