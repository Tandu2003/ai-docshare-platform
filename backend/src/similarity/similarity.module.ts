import { Module } from '@nestjs/common';
import { SimilarityController } from './similarity.controller';
import { SimilarityService } from './similarity.service';
import { SimilarityJobService } from './similarity-job.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PrismaModule, AIModule, FilesModule],
  controllers: [SimilarityController],
  providers: [SimilarityService, SimilarityJobService],
  exports: [SimilarityService, SimilarityJobService],
})
export class SimilarityModule {}
