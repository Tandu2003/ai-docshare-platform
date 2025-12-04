import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './analytics.service';
import {
  ActivityAnalyticsService,
  AnalyticsUtilService,
  DashboardAnalyticsService,
  TrendingAnalyticsService,
} from './services';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    // Domain-specific analytics services
    AnalyticsUtilService,
    DashboardAnalyticsService,
    TrendingAnalyticsService,
    ActivityAnalyticsService,
  ],
  exports: [
    AnalyticsService,
    DashboardAnalyticsService,
    TrendingAnalyticsService,
    ActivityAnalyticsService,
  ],
})
export class AnalyticsModule {}
