import { AIModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  SimilarityAlgorithmService,
  SimilarityDetectionService,
  SimilarityEmbeddingService,
  SimilarityModerationService,
  SimilarityTextExtractionService,
} from './services';
import { SimilarityJobService } from './similarity-job.service';
import { SimilarityController } from './controllers/similarity.controller';
import { SimilarityService } from './similarity.service';
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
