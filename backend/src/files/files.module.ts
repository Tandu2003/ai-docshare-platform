import { Module } from '@nestjs/common'

import { CloudflareR2Service } from '../common/cloudflare-r2.service'
import { PrismaModule } from '../prisma/prisma.module'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilesService, CloudflareR2Service],
  exports: [FilesService],
})
export class FilesModule {}
