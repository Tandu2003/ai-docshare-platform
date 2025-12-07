import { PointTxnReason, PointTxnType } from '@prisma/client';

export interface UserBalance {
  readonly balance: number;
}
export interface PointTransaction {
  readonly id: string;
  readonly userId: string;
  readonly type: PointTxnType;
  readonly amount: number;
  readonly reason: PointTxnReason;
  readonly note: string | null;
  readonly documentId: string | null;
  readonly performedById: string | null;
  readonly createdAt: Date;
  readonly document?: {
    readonly id: string;
    readonly title: string;
  } | null;
  readonly performedBy?: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly username: string;
  } | null;
}

export interface TransactionListResult {
  readonly items: PointTransaction[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface ListTransactionsOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly userId?: string;
  readonly type?: PointTxnType;
  readonly reason?: PointTxnReason;
  readonly search?: string;
  readonly from?: Date;
  readonly to?: Date;
}

export interface ManualAdjustmentPayload {
  readonly userId: string;
  readonly amount: number;
  readonly reason: string;
}

export interface PointsStatistics {
  readonly totalPointsAwarded: number;
  readonly totalPointsDeducted: number;
  readonly totalTransactions: number;
  readonly averageBalance: number;
  readonly topEarners: TopEarner[];
}

export interface TopEarner {
  readonly userId: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly totalEarned: number;
  readonly currentBalance: number;
}
