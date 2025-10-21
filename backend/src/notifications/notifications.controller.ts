import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
}
