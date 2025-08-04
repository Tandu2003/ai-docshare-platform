import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PrismaModule } from '../prisma/prisma.module'
import { CloudflareR2Service } from './cloudflare-r2.service'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [UploadController],
  providers: [UploadService, CloudflareR2Service],
  exports: [UploadService, CloudflareR2Service],
})
export class UploadModule {}
