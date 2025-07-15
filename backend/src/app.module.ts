import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule, HealthModule],
  controllers: [],
  providers: [
    // Global Exception Filter as provider
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
