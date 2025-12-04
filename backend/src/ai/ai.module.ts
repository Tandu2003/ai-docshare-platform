import { CategoriesModule } from '../categories/categories.module';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AIController } from './controllers/ai.controller';
import { AIService } from './ai.service';
import { ContentExtractorService } from './content-extractor.service';
import { EmbeddingMigrationService } from './embedding-migration.service';
import { EmbeddingService } from './embedding.service';
import { GeminiService } from './gemini.service';
import {
  QueryProcessorService,
  SearchCacheService,
  SearchHistoryService,
  SearchMetricsService,
} from './services';
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
    EmbeddingMigrationService,
    VectorSearchService,
    SystemSettingsService,
    QueryProcessorService,
    SearchCacheService,
    SearchHistoryService,
    SearchMetricsService,
  ],
  exports: [
    AIService,
    GeminiService,
    ContentExtractorService,
    EmbeddingService,
    EmbeddingMigrationService,
    VectorSearchService,
    QueryProcessorService,
    SearchCacheService,
    SearchHistoryService,
    SearchMetricsService,
  ],
})
export class AIModule {}
