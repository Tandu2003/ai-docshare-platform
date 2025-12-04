import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'onlyUnread', required: false, type: Boolean })
  @Get()
  async getMyNotifications(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const userId = req.user.id as string;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const where: any = { userId };
    if (onlyUnread === 'true') where.isRead = false;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      success: true,
      data: items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @ApiOperation({ summary: 'Test WebSocket notification' })
  @Post('test')
  async testNotification(@Req() req: any) {
    const userId = req.user.id;

    // Test moderation notification
    await this.notificationsService.emitToUser(userId, {
      type: 'moderation',
      documentId: 'test-doc-123',
      status: 'approved',
      notes:
        'AI Tự động phê duyệt: Điểm 95% - Điểm 95% đạt ngưỡng phê duyệt 90%',
      reason: 'Điểm 95% đạt ngưỡng phê duyệt 90%',
    });

    return {
      success: true,
      message: 'Test notification sent and saved to database',
      userId,
    };
  }

  @ApiOperation({ summary: 'Get WebSocket status' })
  @Get('ws-status')
  getWebSocketStatus(@Req() req: any) {
    const userId = req.user.id;
    const room = `user:${userId}`;

    const server = this.notificationsGateway.server;
    const allSockets = server?.sockets?.sockets;
    const totalConnections = allSockets?.size ?? 0;

    // Check sockets in user's room
    const roomSockets = server?.sockets?.adapter?.rooms?.get(room);
    const userConnections = roomSockets?.size ?? 0;

    // Get list of rooms for debugging
    const allRooms = server?.sockets?.adapter?.rooms
      ? Array.from(server.sockets.adapter.rooms.keys()).filter(r =>
          r.startsWith('user:'),
        )
      : [];

    return {
      success: true,
      data: {
        userId,
        room,
        totalConnections,
        userConnections,
        isUserConnected: userConnections > 0,
        allUserRooms: allRooms,
        serverAvailable: !!server,
      },
    };
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @Patch(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id as string;

    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return {
        success: false,
        message: 'Notification not found',
      };
    }

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id as string;

    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @Delete(':id')
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id as string;

    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return {
        success: false,
        message: 'Notification not found',
      };
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @Delete()
  async deleteNotifications(@Req() req: any, @Body('ids') ids: string[]) {
    const userId = req.user.id as string;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        message: 'No notification IDs provided',
      };
    }

    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    return {
      success: true,
      message: `${result.count} notifications deleted`,
      deletedCount: result.count,
    };
  }
}
