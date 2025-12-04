/**
 * Analytics Module - Centralized exports
 */

// ============================================================================
// Services
// ============================================================================
export { AnalyticsService } from './analytics.service';

// Domain-specific analytics services
export {
  AnalyticsUtilService,
  DashboardAnalyticsService,
  TrendingAnalyticsService,
  ActivityAnalyticsService,
} from './services';

// ============================================================================
// Controllers
// ============================================================================
export { AnalyticsController } from './controllers/analytics.controller';

// ============================================================================
// Module
// ============================================================================
export { AnalyticsModule } from './analytics.module';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  DashboardOverview,
  RecentDocument,
  CategoryStat,
  ActivityLogItem,
  AdminStats,
  DocumentTrends,
  TrendDataPoint,
  TrendSummary,
  UserAnalytics,
  TopDocument,
  AnalyticsRange,
} from './interfaces';

export { ANALYTICS_RANGES, DEFAULT_ANALYTICS_RANGE } from './interfaces';
