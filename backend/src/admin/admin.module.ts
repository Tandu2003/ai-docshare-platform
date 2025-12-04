import { PrismaModule } from '../prisma/prisma.module';
import { SystemSettingsController } from './controllers/system-settings.controller';
import { SystemSettingsService } from '@/common/system-settings.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class AdminModule {}
