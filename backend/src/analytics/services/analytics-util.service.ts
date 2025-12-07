import { Injectable } from '@nestjs/common';

// Constants
export const RANGE_TO_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};
export const DEFAULT_RANGE = '30d';
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Time Range Result Interface

export interface TimeRangeResult {
  range: string;
  days: number;
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

@Injectable()
export class AnalyticsUtilService {
  subtractDays(date: Date, days: number): Date {
    return new Date(date.getTime() - days * MS_PER_DAY);
  }

  subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  endOfMonth(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  formatMonthLabel(date: Date): string {
    return date.toLocaleString('en', { month: 'short' });
  }

  resolveRange(range: string | undefined): TimeRangeResult {
    const normalized = range?.toLowerCase();
    const days =
      normalized && RANGE_TO_DAYS[normalized]
        ? RANGE_TO_DAYS[normalized]
        : RANGE_TO_DAYS[DEFAULT_RANGE];

    const endDate = new Date();
    const startDate = this.subtractDays(endDate, days);
    const previousStartDate = this.subtractDays(startDate, days);
    const previousEndDate = startDate;

    return {
      range:
        normalized && RANGE_TO_DAYS[normalized] ? normalized : DEFAULT_RANGE,
      days,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    };
  }

  getDayKey(d: Date): string {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      .toISOString()
      .slice(0, 10);
  }

  getActivityDescription(activity: {
    user?: {
      firstName: string | null;
      lastName: string | null;
      username: string;
    } | null;
    action: string;
    resourceType?: string | null;
  }): string {
    const userName = activity.user
      ? `${activity.user.firstName} ${activity.user.lastName}`.trim() ||
        activity.user.username
      : 'Người dùng ẩn danh';

    switch (activity.action) {
      case 'login':
        return `${userName} đã đăng nhập`;
      case 'logout':
        return `${userName} đã đăng xuất`;
      case 'upload':
        return `${userName} đã tải lên tài liệu mới`;
      case 'download':
        return `${userName} đã tải xuống tài liệu`;
      case 'view':
        return `${userName} đã xem tài liệu`;
      case 'create':
        return `${userName} đã tạo ${activity.resourceType || 'tài nguyên'}`;
      case 'update':
        return `${userName} đã cập nhật ${activity.resourceType || 'tài nguyên'}`;
      case 'delete':
        return `${userName} đã xóa ${activity.resourceType || 'tài nguyên'}`;
      case 'register':
        return `${userName} đã đăng ký tài khoản`;
      case 'verify_email':
        return `${userName} đã xác thực email`;
      default:
        return `${userName} đã thực hiện ${activity.action}`;
    }
  }

  calculateChange(current: number, previous: number): number {
    if (previous > 0) {
      return Number((((current - previous) / previous) * 100).toFixed(1));
    }
    return current > 0 ? 100 : 0;
  }

  calculatePercentage(count: number, total: number): number {
    return total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
  }
}
