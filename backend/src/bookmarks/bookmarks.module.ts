import { PrismaModule } from '../prisma/prisma.module';
import { BookmarksController } from './controllers/bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
