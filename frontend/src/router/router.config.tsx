import { lazy, Suspense } from 'react';

import { createBrowserRouter, Navigate } from 'react-router-dom';

import { MainLayout, ProtectedRoute } from '@/components/layout';
import { LoadingPage } from '@/components/ui/loading-skeleton';
// Critical routes - loaded immediately
import { DashboardPage, LoginPage, RegisterPage } from '@/pages';

// Lazy load other routes for better code splitting
const ForgotPasswordPage = lazy(() =>
  import('@/pages/forgot-password').then(m => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/reset-password').then(m => ({
    default: m.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/verify-email').then(m => ({
    default: m.VerifyEmailPage,
  })),
);
const ResendVerificationPage = lazy(() =>
  import('@/pages/resend-verification').then(m => ({
    default: m.ResendVerificationPage,
  })),
);
const DocumentsPage = lazy(() =>
  import('@/pages/documents-page').then(m => ({
    default: m.DocumentsPage,
  })),
);
const DocumentDetailPage = lazy(() =>
  import('@/pages/document-detail-page').then(m => ({
    default: m.DocumentDetailPage,
  })),
);
const UploadPage = lazy(() =>
  import('@/pages/upload-page').then(m => ({
    default: m.UploadPage,
  })),
);
const CategoriesPage = lazy(() =>
  import('@/pages/categories-page').then(m => ({
    default: m.CategoriesPage,
  })),
);
const CategoryDetailPage = lazy(() =>
  import('@/pages/category-detail-page').then(m => ({
    default: m.CategoryDetailPage,
  })),
);
const BookmarksPage = lazy(() =>
  import('@/pages/bookmarks-page').then(m => ({
    default: m.BookmarksPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/notifications-page').then(m => ({
    default: m.NotificationsPage,
  })),
);
const MyDocumentsPage = lazy(() =>
  import('@/pages/my-documents-page').then(m => ({
    default: m.MyDocumentsPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/pages/profile-page').then(m => ({
    default: m.ProfilePage,
  })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings-page').then(m => ({
    default: m.SettingsPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import('@/pages/analytics-page').then(m => ({
    default: m.AnalyticsPage,
  })),
);
const TrendingPage = lazy(() =>
  import('@/pages/trending-page').then(m => ({
    default: m.TrendingPage,
  })),
);
const TopRatedPage = lazy(() =>
  import('@/pages/top-rated-page').then(m => ({
    default: m.TopRatedPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin-dashboard-page').then(m => ({
    default: m.AdminDashboardPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin-users-page').then(m => ({
    default: m.AdminUsersPage,
  })),
);
const AdminPointsPage = lazy(() =>
  import('@/pages/admin-points-page').then(m => ({
    default: m.AdminPointsPage,
  })),
);
const SystemSettingsPage = lazy(() =>
  import('@/pages/system-settings-page').then(m => ({
    default: m.SystemSettingsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then(m => ({
    default: m.NotFoundPage,
  })),
);
const UnauthorizedPage = lazy(() =>
  import('@/pages/unauthorized').then(m => ({
    default: m.UnauthorizedPage,
  })),
);

// Wrapper component for lazy-loaded routes
const LazyRoute = ({
  component: Component,
}: {
  component: React.ComponentType;
}) => (
  <Suspense
    fallback={
      <LoadingPage
        title="Đang tải..."
        description="Vui lòng đợi trong giây lát"
        showStats={false}
        showTable={false}
        showList={false}
      />
    }
  >
    <Component />
  </Suspense>
);

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
        <LazyRoute component={ForgotPasswordPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/reset-password',
    element: (
      <ProtectedRoute requireAuth={false}>
        <LazyRoute component={ResetPasswordPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/verify-email',
    element: (
      <ProtectedRoute requireAuth={false}>
        <LazyRoute component={VerifyEmailPage} />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/resend-verification',
    element: (
      <ProtectedRoute requireAuth={false}>
        <LazyRoute component={ResendVerificationPage} />
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
        element: <LazyRoute component={DocumentsPage} />,
      },
      {
        path: 'documents/:documentId',
        element: <LazyRoute component={DocumentDetailPage} />,
      },
      {
        path: 'upload',
        element: <LazyRoute component={UploadPage} />,
      },
      {
        path: 'categories',
        element: <LazyRoute component={CategoriesPage} />,
      },
      {
        path: 'categories/:id',
        element: <LazyRoute component={CategoryDetailPage} />,
      },
      {
        path: 'bookmarks',
        element: <LazyRoute component={BookmarksPage} />,
      },
      {
        path: 'notifications',
        element: <LazyRoute component={NotificationsPage} />,
      },
      {
        path: 'my-documents',
        element: <LazyRoute component={MyDocumentsPage} />,
      },
      {
        path: 'profile',
        element: <LazyRoute component={ProfilePage} />,
      },
      {
        path: 'settings',
        element: <LazyRoute component={SettingsPage} />,
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyRoute component={AnalyticsPage} />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trending',
        element: <LazyRoute component={TrendingPage} />,
      },
      {
        path: 'top-rated',
        element: <LazyRoute component={TopRatedPage} />,
      },
      {
        path: 'moderation',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyRoute component={AdminDashboardPage} />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyRoute component={AdminUsersPage} />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyRoute component={SystemSettingsPage} />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/points',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyRoute component={AdminPointsPage} />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Error pages
  {
    path: '/unauthorized',
    element: <LazyRoute component={UnauthorizedPage} />,
  },
  {
    path: '*',
    element: <LazyRoute component={NotFoundPage} />,
  },
]);
