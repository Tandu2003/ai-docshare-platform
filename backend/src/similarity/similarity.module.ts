import { AIModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SimilarityJobService } from './similarity-job.service';
import { SimilarityController } from './similarity.controller';
import { SimilarityService } from './similarity.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AIModule, FilesModule],
  controllers: [SimilarityController],
  providers: [SimilarityService, SimilarityJobService],
  exports: [SimilarityService, SimilarityJobService],
})
export class SimilarityModule {}
