import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';
import { ContentExtractorService } from './content-extractor.service';

@Module({
  imports: [ConfigModule, PrismaModule, FilesModule],
  controllers: [AIController],
  providers: [AIService, GeminiService, ContentExtractorService],
  exports: [AIService, GeminiService, ContentExtractorService],
})
export class AIModule {}
