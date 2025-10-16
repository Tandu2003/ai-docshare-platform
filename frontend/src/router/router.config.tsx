import { createBrowserRouter, Navigate } from 'react-router-dom';

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
import AdminUsersPage from '@/pages/AdminUsersPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import BookmarksPage from '@/pages/BookmarksPage';
import CategoriesPage from '@/pages/CategoriesPage';
import DocumentDetailPage from '@/pages/DocumentDetailPage';
import DocumentsPage from '@/pages/DocumentsPage';
import MyDocumentsPage from '@/pages/MyDocumentsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import TopRatedPage from '@/pages/TopRatedPage';
import TrendingPage from '@/pages/TrendingPage';
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
        path: 'bookmarks',
        element: <BookmarksPage />,
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
        element: <SettingsPage />,
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute
            requiredPermissions={[{ action: 'read', subject: 'SystemSetting' }]}
          >
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trending',
        element: <TrendingPage />,
      },
      {
        path: 'top-rated',
        element: <TopRatedPage />,
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute
            requiredPermissions={[{ action: 'read', subject: 'User' }]}
          >
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute
            requiredPermissions={[{ action: 'read', subject: 'User' }]}
          >
            <AdminUsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <ProtectedRoute
            requiredPermissions={[{ action: 'read', subject: 'SystemSetting' }]}
          >
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground text-lg">
                System Settings - Coming Soon
              </p>
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
