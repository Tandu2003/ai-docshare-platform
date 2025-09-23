export * from './dashboard';
export * from './login';
export * from './not-found';
export * from './register';
export * from './unauthorized';

// Named exports for specific pages
export { default as AdminUsersPage } from './AdminUsersPage';
export { default as AnalyticsPage } from './AnalyticsPage';
export { default as BookmarksPage } from './BookmarksPage';
export { default as DocumentDetailPage } from './DocumentDetailPage';
export { default as DocumentsPage } from './DocumentsPage';
export { ForgotPasswordPage } from './forgot-password';
export { ResendVerificationPage } from './resend-verification';
export { ResetPasswordPage } from './reset-password';
export { default as SettingsPage } from './SettingsPage';
export { default as TopRatedPage } from './TopRatedPage';
export { default as TrendingPage } from './TrendingPage';
export { VerifyEmailPage } from './verify-email';
