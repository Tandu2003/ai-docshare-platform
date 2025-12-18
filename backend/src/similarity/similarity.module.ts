import { AIModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SimilarityController } from './controllers/similarity.controller';
import {
  SimilarityAlgorithmService,
  SimilarityDetectionService,
  SimilarityEmbeddingService,
  SimilarityModerationService,
  SimilarityTextExtractionService,
} from './services';
import { SimilarityConfigService } from './services/similarity-config.service';
import { SimilarityWorkerService } from './services/similarity-worker.service';
import { SimilarityJobService } from './similarity-job.service';
import { SimilarityService } from './similarity.service';
import { AdminModule } from '@/admin/admin.module';
import { ChunkingService } from '@/common/services/chunking.service';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { EmbeddingTextBuilderService } from '@/common/services/embedding-text-builder.service';
import { TextPreprocessingService } from '@/common/services/text-preprocessing.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AIModule, FilesModule, AdminModule],
  controllers: [SimilarityController],
  providers: [
    SimilarityService,
    SimilarityJobService,
    SimilarityAlgorithmService,
    SimilarityDetectionService,
    SimilarityEmbeddingService,
    SimilarityModerationService,
    SimilarityTextExtractionService,
    SimilarityConfigService,
    SimilarityWorkerService,
    EmbeddingTextBuilderService,
    EmbeddingStorageService,
    TextPreprocessingService,
    ChunkingService,
  ],
  exports: [
    SimilarityService,
    SimilarityJobService,
    SimilarityAlgorithmService,
    SimilarityDetectionService,
    SimilarityEmbeddingService,
    SimilarityModerationService,
    SimilarityTextExtractionService,
    SimilarityConfigService,
    SimilarityWorkerService,
    TextPreprocessingService,
    ChunkingService,
  ],
})
export class SimilarityModule {}
