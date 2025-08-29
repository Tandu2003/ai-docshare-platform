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
import DocumentDetailPage from '@/pages/DocumentDetailPage';
import DocumentsPage from '@/pages/DocumentsPage';
import { UploadPage } from '@/pages/UploadPage';

export const router = createBrowserRouter([
  // Root route - conditionally shows HomePage or DashboardPage based on auth status
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền xem tài liệu để truy cập trang chủ"
            requiredActionText="xem tài liệu"
          >
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền xem tài liệu để truy cập trang này"
            requiredActionText="xem tài liệu"
          >
            <DocumentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents/:documentId',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền xem tài liệu để truy cập trang này"
            requiredActionText="xem tài liệu"
          >
            <DocumentDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'upload',
        element: (
          <ProtectedRoute
            requiredAction="create"
            requiredSubject="Document"
            message="Bạn cần quyền tạo tài liệu để truy cập trang này"
            requiredActionText="tạo tài liệu"
          >
            <UploadPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="User"
            message="Bạn cần quyền xem thông tin cá nhân để truy cập trang này"
            requiredActionText="xem thông tin cá nhân"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Profile Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute
            requiredAction="update"
            requiredSubject="User"
            message="Bạn cần quyền cập nhật thông tin cá nhân để truy cập trang này"
            requiredActionText="cập nhật thông tin cá nhân"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Settings Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      // New routes for comprehensive navigation
      {
        path: 'categories',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Category"
            message="Bạn cần quyền xem danh mục để truy cập trang này"
            requiredActionText="xem danh mục"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Categories Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'search',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền tìm kiếm tài liệu để truy cập trang này"
            requiredActionText="tìm kiếm tài liệu"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Advanced Search Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'ai-analysis',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền xem tài liệu để sử dụng AI Analysis"
            requiredActionText="sử dụng AI Analysis"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">AI Analysis Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'recommendations',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền xem tài liệu để xem gợi ý"
            requiredActionText="xem gợi ý"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Recommendations Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'bookmarks',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Bookmark"
            message="Bạn cần quyền xem bookmark để truy cập trang này"
            requiredActionText="xem bookmark"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Bookmarks Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'downloads',
        element: (
          <ProtectedRoute
            requiredAction="download"
            requiredSubject="Document"
            message="Bạn cần quyền tải tài liệu để xem lịch sử tải"
            requiredActionText="xem lịch sử tải"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Downloads Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'search-history',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Document"
            message="Bạn cần quyền xem tài liệu để xem lịch sử tìm kiếm"
            requiredActionText="xem lịch sử tìm kiếm"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Search History Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'ratings',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Rating"
            requiredConditions={{ userId: 'current' }}
            message="Bạn cần quyền xem đánh giá để truy cập trang này"
            requiredActionText="xem đánh giá"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">My Ratings Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'comments',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Comment"
            requiredConditions={{ userId: 'current' }}
            message="Bạn cần quyền xem bình luận để truy cập trang này"
            requiredActionText="xem bình luận"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">My Comments Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute
            requiredAction="read"
            requiredSubject="Notification"
            requiredConditions={{ userId: 'current' }}
            message="Bạn cần quyền xem thông báo để truy cập trang này"
            requiredActionText="xem thông báo"
          >
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">Notifications Page - Coming Soon</p>
            </div>
          </ProtectedRoute>
        ),
      },
      // Admin routes
      {
        path: 'admin',
        children: [
          {
            path: 'users',
            element: (
              <ProtectedRoute
                requiredAction="moderate"
                requiredSubject="User"
                message="Bạn cần quyền quản lý người dùng để truy cập trang này"
                requiredActionText="quản lý người dùng"
              >
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 text-lg">User Management Page - Coming Soon</p>
                </div>
              </ProtectedRoute>
            ),
          },
          {
            path: 'documents',
            element: (
              <ProtectedRoute
                requiredAction="moderate"
                requiredSubject="Document"
                message="Bạn cần quyền kiểm duyệt tài liệu để truy cập trang này"
                requiredActionText="kiểm duyệt tài liệu"
              >
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 text-lg">Document Moderation Page - Coming Soon</p>
                </div>
              </ProtectedRoute>
            ),
          },
          {
            path: 'analytics',
            element: (
              <ProtectedRoute
                requiredAction="read"
                requiredSubject="Analytics"
                message="Bạn cần quyền xem analytics để truy cập trang này"
                requiredActionText="xem analytics"
              >
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 text-lg">Analytics Page - Coming Soon</p>
                </div>
              </ProtectedRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <ProtectedRoute
                requiredAction="manage"
                requiredSubject="all"
                message="Bạn cần quyền quản lý hệ thống để truy cập trang này"
                requiredActionText="quản lý hệ thống"
              >
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 text-lg">System Settings Page - Coming Soon</p>
                </div>
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
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
