import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SimilarityJobService } from './similarity-job.service';
import { SimilarityService } from './similarity.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

@Controller('similarity')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SimilarityController {
  constructor(
    private similarityService: SimilarityService,
    private similarityJobService: SimilarityJobService,
  ) {}

  /**
   * Queue similarity detection for a document (admin only)
   */
  @Post('detect/:documentId')
  async queueSimilarityDetection(@Param('documentId') documentId: string) {
    return await this.similarityJobService.queueSimilarityDetection(documentId);
  }

  /**
   * Get similarity results for moderation (admin only)
   */
  @Get('results/:documentId')
  async getSimilarityResults(@Param('documentId') documentId: string) {
    return await this.similarityService.getSimilarityResultsForModeration(
      documentId,
    );
  }

  /**
   * Process admin decision on similarity (admin only)
   */
  @Put('decision/:similarityId')
  async processSimilarityDecision(
    @Param('similarityId') similarityId: string,
    @Body() decision: { isDuplicate: boolean; notes?: string },
    @Request() req: any,
  ) {
    const adminId = req.user.id; // Get current user from JWT
    return await this.similarityService.processSimilarityDecision(
      similarityId,
      adminId,
      decision,
    );
  }

  /**
   * Generate embedding for a document (admin only)
   */
  @Post('embedding/:documentId')
  async generateEmbedding(@Param('documentId') documentId: string) {
    const embedding =
      await this.similarityService.generateDocumentEmbedding(documentId);
    return { success: true, embeddingLength: embedding.length };
  }
}
