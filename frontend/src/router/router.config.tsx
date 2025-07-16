import { Navigate, createBrowserRouter } from 'react-router-dom';

import { MainLayout, ProtectedRoute } from '../components/layout';
import { DashboardPage, LoginPage, NotFoundPage, RegisterPage, UnauthorizedPage } from '../pages';

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
