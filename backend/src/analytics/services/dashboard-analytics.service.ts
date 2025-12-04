/**
 * Dashboard Analytics Service
 *
 * Handles dashboard-related analytics:
 * - Admin dashboard overview
 * - User-specific dashboard data
 */

import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsUtilService } from './analytics-util.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utilService: AnalyticsUtilService,
  ) {}

  /**
   * Get admin dashboard overview
   */
  async getDashboardOverview() {
    const currentDate = new Date();
    const startOfCurrentMonth = this.utilService.startOfMonth(currentDate);

    const [
      totalDocuments,
      totalUsers,
      downloadsAggregate,
      viewsAggregate,
      recentDocumentsRaw,
      categoryAggregates,
      activityLogsRaw,
      notificationsRaw,
      newUsersThisMonth,
      newDocumentsThisMonth,
      downloadsThisMonth,
      viewsThisMonth,
      unverifiedUsers,
      pendingReports,
    ] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.user.count(),
      this.prisma.document.aggregate({
        _sum: { downloadCount: true },
      }),
      this.prisma.document.aggregate({
        _sum: { viewCount: true },
      }),
      this.prisma.document.findMany({
        where: { isPublic: true },
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.document.groupBy({
        by: ['categoryId'],
        _count: { categoryId: true },
        _sum: { downloadCount: true, viewCount: true },
        orderBy: { _sum: { downloadCount: 'desc' } },
        take: 6,
      }),
      this.prisma.activityLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.notification.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfCurrentMonth } },
      }),
      this.prisma.document.count({
        where: { createdAt: { gte: startOfCurrentMonth } },
      }),
      this.prisma.download.aggregate({
        _count: true,
        where: { downloadedAt: { gte: startOfCurrentMonth } },
      }),
      this.prisma.view.aggregate({
        _count: true,
        where: { viewedAt: { gte: startOfCurrentMonth } },
      }),
      this.prisma.user.count({ where: { isVerified: false } }),
      Promise.resolve(0),
    ]);

    const popularCategories = await this.buildCategoryStats(categoryAggregates);
    const userActivity = this.mapActivityLogs(activityLogsRaw);
    const recentNotifications = this.mapNotifications(notificationsRaw);

    return {
      totalDocuments,
      totalUsers,
      totalDownloads: Number(downloadsAggregate._sum.downloadCount ?? 0),
      totalViews: Number(viewsAggregate._sum.viewCount ?? 0),
      recentDocuments: recentDocumentsRaw,
      popularCategories,
      userActivity,
      recentNotifications,
      newUsersThisMonth,
      newDocumentsThisMonth,
      downloadsThisMonth: downloadsThisMonth._count,
      viewsThisMonth: viewsThisMonth._count,
      unverifiedUsers,
      pendingReports,
    };
  }

  /**
   * Get user-specific dashboard overview
   */
  async getUserDashboardOverview(userId: string) {
    const [
      userDocumentsCount,
      userDownloadsAggregate,
      userViewsAggregate,
      userRatingAggregate,
      userRecentDocumentsRaw,
      userActivityLogsRaw,
      userNotificationsRaw,
      globalCategories,
    ] = await Promise.all([
      this.prisma.document.count({ where: { uploaderId: userId } }),
      this.prisma.document.aggregate({
        where: { uploaderId: userId },
        _sum: { downloadCount: true },
      }),
      this.prisma.document.aggregate({
        where: { uploaderId: userId },
        _sum: { viewCount: true },
      }),
      this.prisma.document.aggregate({
        where: { uploaderId: userId, averageRating: { gt: 0 } },
        _avg: { averageRating: true },
        _count: { averageRating: true },
      }),
      this.prisma.document.findMany({
        where: { uploaderId: userId },
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.activityLog.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.notification.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.category.findMany({
        include: { _count: { select: { documents: true } } },
        orderBy: { documents: { _count: 'desc' } },
        take: 6,
      }),
    ]);

    const popularCategories = globalCategories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      documentCount: category._count.documents,
      totalDownloads: 0,
      totalViews: 0,
    }));

    const userActivity = this.mapActivityLogs(userActivityLogsRaw);
    const recentNotifications = this.mapNotifications(userNotificationsRaw);

    return {
      totalDocuments: userDocumentsCount,
      totalUsers: 1,
      totalDownloads: Number(userDownloadsAggregate._sum.downloadCount ?? 0),
      totalViews: Number(userViewsAggregate._sum.viewCount ?? 0),
      averageRating: Number(userRatingAggregate._avg.averageRating ?? 0),
      recentDocuments: userRecentDocumentsRaw,
      popularCategories,
      userActivity,
      recentNotifications,
    };
  }

  /**
   * Build category statistics from aggregates
   */
  private async buildCategoryStats(
    categoryAggregates: Array<{
      categoryId: string;
      _count: { categoryId: number };
      _sum: { downloadCount: number | null; viewCount: number | null };
    }>,
  ) {
    const categoryIds = categoryAggregates.map(item => item.categoryId);
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            color: true,
          },
        })
      : [];

    const categoryMap = new Map(
      categories.map(category => [category.id, category]),
    );

    return categoryAggregates.map(aggregate => {
      const category = categoryMap.get(aggregate.categoryId);
      return {
        id: aggregate.categoryId,
        name: category?.name ?? 'Unknown',
        description: category?.description ?? null,
        icon: category?.icon ?? '📄',
        color: category?.color ?? null,
        documentCount: aggregate._count.categoryId,
        totalDownloads: Number(aggregate._sum.downloadCount ?? 0),
        totalViews: Number(aggregate._sum.viewCount ?? 0),
      };
    });
  }

  /**
   * Map activity logs to response format
   */
  private mapActivityLogs(
    activityLogsRaw: Array<{
      id: string;
      userId: string | null;
      action: string;
      resourceType: string | null;
      resourceId: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      metadata: unknown;
      createdAt: Date;
      user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        username: string;
      } | null;
    }>,
  ) {
    return activityLogsRaw.map(activity => ({
      id: activity.id,
      userId: activity.userId ?? undefined,
      action: activity.action,
      resourceType: activity.resourceType ?? undefined,
      resourceId: activity.resourceId ?? undefined,
      ipAddress: activity.ipAddress ?? undefined,
      userAgent: activity.userAgent ?? undefined,
      metadata: activity.metadata ?? undefined,
      createdAt: activity.createdAt,
      timestamp: activity.createdAt,
      description: this.utilService.getActivityDescription(activity),
      user: activity.user
        ? {
            id: activity.user.id,
            firstName: activity.user.firstName,
            lastName: activity.user.lastName,
            avatar: activity.user.avatar ?? undefined,
            username: activity.user.username,
          }
        : undefined,
    }));
  }

  /**
   * Map notifications to response format
   */
  private mapNotifications(
    notificationsRaw: Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      message: string;
      data: unknown;
      isRead: boolean;
      readAt: Date | null;
      createdAt: Date;
      user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        username: string;
      };
    }>,
  ) {
    return notificationsRaw.map(notification => ({
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ?? undefined,
      isRead: notification.isRead,
      readAt: notification.readAt ?? undefined,
      createdAt: notification.createdAt,
      user: {
        id: notification.user.id,
        firstName: notification.user.firstName,
        lastName: notification.user.lastName,
        avatar: notification.user.avatar ?? undefined,
        username: notification.user.username,
      },
    }));
  }
}
