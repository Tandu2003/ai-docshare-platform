import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminOnly, CaslGuard, CheckPolicy } from '@/common/casl';
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
@UseGuards(JwtAuthGuard, CaslGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
  @ApiOperation({ summary: 'Get dashboard overview stats (Admin only)' })
  async getDashboardOverview(@Req() _req: Request, @Res() res: Response) {
    const dashboard = await this.analyticsService.getDashboardOverview();
    return ResponseHelper.success(res, dashboard);
  }

  @Get('user-dashboard')
  @ApiOperation({ summary: 'Get user dashboard overview stats' })
  async getUserDashboardOverview(@Req() _req: Request, @Res() res: Response) {
    const dashboard = await this.analyticsService.getUserDashboardOverview();
    return ResponseHelper.success(res, dashboard);
  }

  @Get()
  @AdminOnly()
  @CheckPolicy({ action: 'read', subject: 'SystemSetting' })
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
  @CheckPolicy({ action: 'read', subject: 'Document' })
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
  @CheckPolicy({ action: 'read', subject: 'Document' })
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
}
