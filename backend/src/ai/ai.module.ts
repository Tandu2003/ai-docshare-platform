import { CategoriesModule } from '../categories/categories.module';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ContentExtractorService } from './content-extractor.service';
import { EmbeddingService } from './embedding.service';
import { GeminiService } from './gemini.service';
import { VectorSearchService } from './vector-search.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, PrismaModule, FilesModule, CategoriesModule],
  controllers: [AIController],
  providers: [
    AIService,
    GeminiService,
    ContentExtractorService,
    EmbeddingService,
    VectorSearchService,
    SystemSettingsService,
  ],
  exports: [
    AIService,
    GeminiService,
    ContentExtractorService,
    EmbeddingService,
    VectorSearchService,
  ],
})
export class AIModule {}
