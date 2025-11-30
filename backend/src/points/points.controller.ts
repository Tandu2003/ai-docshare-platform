import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnly, RoleGuard } from '../common/authorization';
import { PointsService } from './points.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PointTxnReason, PointTxnType } from '@prisma/client';

@ApiTags('Points')
@Controller('points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get user points balance' })
  async balance(@Req() req: any) {
    const userId = req.user?.id;
    return this.points.getBalance(userId);
  }

  @Get('download-status/:documentId')
  @ApiOperation({
    summary: 'Check if user has already downloaded a document successfully',
  })
  async checkDownloadStatus(
    @Req() req: any,
    @Param('documentId') documentId: string,
  ) {
    const userId = req.user?.id;
    const hasDownloaded = await this.points.hasSuccessfulDownload(
      userId,
      documentId,
    );
    return { hasDownloaded };
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

  @Get('admin/transactions')
  @UseGuards(RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'List point transactions for all users (admin)' })
  async adminTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('type') type?: PointTxnType,
    @Query('reason') reason?: PointTxnReason,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const parsedType =
      typeof type === 'string' && Object.values(PointTxnType).includes(type)
        ? type
        : undefined;
    const parsedReason =
      typeof reason === 'string' &&
      Object.values(PointTxnReason).includes(reason)
        ? reason
        : undefined;

    const fromDateRaw =
      typeof from === 'string' && from.trim() ? new Date(from) : undefined;
    const toDateRaw =
      typeof to === 'string' && to.trim() ? new Date(to) : undefined;
    const fromDate =
      fromDateRaw && !Number.isNaN(fromDateRaw.getTime())
        ? fromDateRaw
        : undefined;
    const toDate =
      toDateRaw && !Number.isNaN(toDateRaw.getTime()) ? toDateRaw : undefined;

    return this.points.listAllTransactions({
      page: Number(page),
      limit: Number(limit),
      userId: userId || undefined,
      type: parsedType,
      reason: parsedReason,
      search: search || undefined,
      from: fromDate,
      to: toDate,
    });
  }

  @Post('admin/adjust')
  @UseGuards(RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Admin adjust user points' })
  async adminAdjust(
    @Req() req: any,
    @Body() body: { userId: string; delta: number; note?: string },
  ) {
    const adminId = req.user?.id;
    return this.points.adminAdjust(adminId, body.userId, body.delta, body.note);
  }

  @Post('admin/set')
  @UseGuards(RoleGuard)
  @AdminOnly()
  @ApiOperation({ summary: 'Admin set user points balance' })
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
