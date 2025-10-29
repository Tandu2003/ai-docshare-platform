import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
