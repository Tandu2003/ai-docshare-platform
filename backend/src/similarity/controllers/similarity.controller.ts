import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { SimilarityJobService } from '@/similarity/similarity-job.service';
import { SimilarityService } from '@/similarity/similarity.service';
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

  @Post('detect/:documentId')
  async queueSimilarityDetection(@Param('documentId') documentId: string) {
    return await this.similarityJobService.queueSimilarityDetection(documentId);
  }

  @Get('results/:documentId')
  async getSimilarityResults(@Param('documentId') documentId: string) {
    return await this.similarityService.getSimilarityResultsForModeration(
      documentId,
    );
  }

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

  @Post('embedding/:documentId')
  async generateEmbedding(@Param('documentId') documentId: string) {
    const embedding =
      await this.similarityService.generateDocumentEmbedding(documentId);
    return { success: true, embeddingLength: embedding.length };
  }

  @Post('process-pending')
  async processPendingJobs() {
    await this.similarityJobService.processPendingJobs();
    return { success: true, message: 'Started processing pending jobs' };
  }

  @Post('detect-sync/:documentId')
  async detectSyncSimilarity(@Param('documentId') documentId: string) {
    this.similarityJobService.runSimilarityDetectionSync(documentId);
    const results =
      await this.similarityService.getSimilarityResultsForModeration(
        documentId,
      );
    return { success: true, results };
  }

  /**
   * Get similarity job status.
   * Frontend can poll this endpoint to check if similarity detection is complete.
   */
  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return await this.similarityJobService.getJobStatus(jobId);
  }

  /**
   * Queue and run similarity detection in background.
   * Returns job ID immediately so frontend can track status.
   */
  @Post('queue/:documentId')
  async queueAndRunSimilarityDetection(
    @Param('documentId') documentId: string,
  ) {
    return await this.similarityJobService.queueAndRunSimilarityDetection(
      documentId,
    );
  }
}
