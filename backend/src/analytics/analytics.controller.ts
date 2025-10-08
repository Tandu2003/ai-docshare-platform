import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';

import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get platform analytics' })
  @ApiQuery({
    name: 'range',
    required: false,
    description: 'Time range for analytics (7d, 30d, 90d, 1y)',
  })
  async getAnalytics(@Query('range') range: string, @Req() _req: Request, @Res() res: Response) {
    const analytics = await this.analyticsService.getAnalytics(range);
    return ResponseHelper.success(res, analytics);
  }
}

