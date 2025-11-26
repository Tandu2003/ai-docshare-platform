import { SystemSettingsController } from '../common/system-settings.controller';
import { SystemSettingsService } from '../common/system-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class AdminModule {}
