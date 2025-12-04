import { createBrowserRouter, Navigate } from 'react-router-dom';

import { MainLayout, ProtectedRoute } from '@/components/layout';
import {
  AdminDashboardPage,
  AdminPointsPage,
  AdminUsersPage,
  AnalyticsPage,
  BookmarksPage,
  CategoriesPage,
  CategoryDetailPage,
  DashboardPage,
  DocumentDetailPage,
  DocumentsPage,
  ForgotPasswordPage,
  LoginPage,
  MyDocumentsPage,
  NotFoundPage,
  NotificationsPage,
  ProfilePage,
  RegisterPage,
  ResendVerificationPage,
  ResetPasswordPage,
  SettingsPage,
  SystemSettingsPage,
  TopRatedPage,
  TrendingPage,
  UnauthorizedPage,
  UploadPage,
  VerifyEmailPage,
} from '@/pages';

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
        path: 'categories/:id',
        element: <CategoryDetailPage />,
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
          <ProtectedRoute requiredRole="admin">
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
        path: 'moderation',
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
            <AdminUsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <ProtectedRoute requiredRole="admin">
            <SystemSettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/points',
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminPointsPage />
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
