/**
 * Points Module - Centralized exports
 */

// ============================================================================
// Services
// ============================================================================
export { PointsService } from './points.service';

// ============================================================================
// Controllers
// ============================================================================
export { PointsController } from './controllers/points.controller';

// ============================================================================
// Module
// ============================================================================
export { PointsModule } from './points.module';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  UserBalance,
  PointTransaction,
  TransactionListResult,
  ListTransactionsOptions,
  ManualAdjustmentPayload,
  PointsStatistics,
  TopEarner,
} from './interfaces';

// ============================================================================
// Constants
// ============================================================================
export {
  DEFAULT_UPLOAD_REWARD,
  DEFAULT_DOWNLOAD_COST,
  DEFAULT_DOWNLOAD_REWARD,
  INITIAL_USER_POINTS,
  POINT_TRANSACTION_TYPES,
  POINT_TRANSACTION_REASONS,
  POINTS_ERROR_MESSAGES,
  POINTS_SUCCESS_MESSAGES,
  DEFAULT_TRANSACTIONS_PAGE,
  DEFAULT_TRANSACTIONS_LIMIT,
  MAX_TRANSACTIONS_LIMIT,
} from './constants';
