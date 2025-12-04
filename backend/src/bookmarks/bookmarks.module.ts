import { PrismaModule } from '../prisma/prisma.module';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './controllers/bookmarks.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
