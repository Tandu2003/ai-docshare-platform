import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminOnly, RoleGuard } from '@/common/authorization';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @AdminOnly()
  @ApiOperation({ summary: 'Get dashboard overview stats (Admin only)' })
  async getDashboardOverview(@Req() _req: Request, @Res() res: Response) {
    const dashboard = await this.analyticsService.getDashboardOverview();
    return ResponseHelper.success(res, dashboard);
  }

  @Get('user-dashboard')
  @ApiOperation({ summary: 'Get user dashboard overview stats' })
  async getUserDashboardOverview(@Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;
    if (!userId) {
      return ResponseHelper.error(res, 'User not authenticated', 401);
    }
    const dashboard =
      await this.analyticsService.getUserDashboardOverview(userId);
    return ResponseHelper.success(res, dashboard);
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Get platform analytics' })
  @ApiQuery({
    name: 'range',
    required: false,
    description: 'Time range for analytics (7d, 30d, 90d, 1y)',
  })
  async getAnalytics(
    @Query('range') range: string,
    @Req() _req: Request,
    @Res() res: Response,
  ) {
    const analytics = await this.analyticsService.getAnalytics(range);
    return ResponseHelper.success(res, analytics);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending documents' })
  @ApiQuery({
    name: 'range',
    required: false,
    description: 'Time range for trending documents (7d, 30d, 90d, 1y)',
  })
  async getTrending(
    @Query('range') range: string,
    @Req() _req: Request,
    @Res() res: Response,
  ) {
    const trending = await this.analyticsService.getTrendingAnalytics(range);
    return ResponseHelper.success(res, trending);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top rated documents' })
  @ApiQuery({
    name: 'range',
    required: false,
    description: 'Time range for top rated documents (7d, 30d, 90d, 1y)',
  })
  @ApiQuery({
    name: 'minRatings',
    required: false,
    description:
      'Minimum number of ratings required for inclusion (default 10)',
  })
  async getTopRated(
    @Query('range') range: string,
    @Query('minRatings') minRatings: string,
    @Req() _req: Request,
    @Res() res: Response,
  ) {
    let minRatingsValue: number | undefined;
    if (typeof minRatings === 'string' && minRatings.trim().length > 0) {
      const parsed = Number(minRatings);
      if (!Number.isNaN(parsed) && parsed > 0) {
        minRatingsValue = parsed;
      }
    }

    const topRated = await this.analyticsService.getTopRatedAnalytics(
      range,
      minRatingsValue,
    );
    return ResponseHelper.success(res, topRated);
  }

  @Get('reports/daily')
  @AdminOnly()
  @ApiOperation({ summary: 'Daily counts: uploads/downloads/views' })
  @ApiQuery({ name: 'range', required: false, description: '7d, 30d, 90d, 1y' })
  async getDailyReport(
    @Query('range') range: string,
    @Req() _req: Request,
    @Res() res: Response,
  ) {
    const data = await this.analyticsService.getDailyActivity(range);
    return ResponseHelper.success(res, data);
  }

  @Get('reports/top')
  @AdminOnly()
  @ApiOperation({ summary: 'Top downloads/views' })
  @ApiQuery({ name: 'metric', required: true, description: 'downloads|views' })
  @ApiQuery({ name: 'range', required: false, description: '7d, 30d, 90d, 1y' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max items (default 10)',
  })
  async getTopReport(
    @Query('metric') metric: 'downloads' | 'views',
    @Query('range') range: string,
    @Query('limit') limit: string,
    @Req() _req: Request,
    @Res() res: Response,
  ) {
    const limitNum = typeof limit === 'string' ? Number(limit) : undefined;
    const data = await this.analyticsService.getTopDocumentsByMetric(
      metric,
      range,
      limitNum,
    );
    return ResponseHelper.success(res, data);
  }
}
