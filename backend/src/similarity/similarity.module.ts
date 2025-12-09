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
import { SimilarityJobService } from './similarity-job.service';
import { SimilarityService } from './similarity.service';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { EmbeddingTextBuilderService } from '@/common/services/embedding-text-builder.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AIModule, FilesModule],
  controllers: [SimilarityController],
  providers: [
    SimilarityService,
    SimilarityJobService,
    SimilarityAlgorithmService,
    SimilarityDetectionService,
    SimilarityEmbeddingService,
    SimilarityModerationService,
    SimilarityTextExtractionService,
    EmbeddingTextBuilderService,
    EmbeddingStorageService,
  ],
  exports: [
    SimilarityService,
    SimilarityJobService,
    SimilarityAlgorithmService,
    SimilarityDetectionService,
    SimilarityEmbeddingService,
    SimilarityModerationService,
    SimilarityTextExtractionService,
  ],
})
export class SimilarityModule {}
