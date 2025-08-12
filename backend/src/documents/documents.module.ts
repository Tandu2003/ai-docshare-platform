import { Module } from '@nestjs/common'

import { CloudflareR2Service } from '../common/cloudflare-r2.service'
import { PrismaModule } from '../prisma/prisma.module'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, CloudflareR2Service],
  exports: [DocumentsService],
})
export class DocumentsModule {}
