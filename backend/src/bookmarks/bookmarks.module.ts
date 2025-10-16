import { CaslModule } from '../common/casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
