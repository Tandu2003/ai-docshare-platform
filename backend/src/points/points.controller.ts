import { PointsService } from './points.service';
import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';

@Controller('points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('balance')
  async balance(@Req() req: any) {
    const userId = req.user?.id;
    return this.points.getBalance(userId);
  }

  @Get('transactions')
  async transactions(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = req.user?.id;
    return this.points.listTransactions(userId, Number(page), Number(limit));
  }

  @Post('admin/adjust')
  async adminAdjust(
    @Req() req: any,
    @Body() body: { userId: string; delta: number; note?: string },
  ) {
    const adminId = req.user?.id;
    return this.points.adminAdjust(adminId, body.userId, body.delta, body.note);
  }

  @Post('admin/set')
  async adminSet(
    @Req() req: any,
    @Body() body: { userId: string; points: number; note?: string },
  ) {
    const adminId = req.user?.id;
    return this.points.adminSetBalance(
      adminId,
      body.userId,
      body.points,
      body.note,
    );
  }
}
