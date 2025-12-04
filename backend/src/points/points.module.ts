import { PointsController } from './controllers/points.controller';
import { PointsService } from './points.service';
import { AdminModule } from '@/admin/admin.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AdminModule],
  providers: [PointsService],
  controllers: [PointsController],
  exports: [PointsService],
})
export class PointsModule {}
