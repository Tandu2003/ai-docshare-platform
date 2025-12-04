import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIService,
} from '@/ai/ai.service';
import { AnalyzeDocumentDto } from '@/ai/dto';
import {
  EmbeddingMigrationService,
  EmbeddingMigrationStatus,
  RegenerationProgress,
} from '@/ai/embedding-migration.service';
import { EmbeddingMetrics, EmbeddingService } from '@/ai/embedding.service';
import { SearchMetrics, VectorSearchService } from '@/ai/vector-search.service';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private readonly aiService: AIService,
    private readonly embeddingService: EmbeddingService,
    private readonly embeddingMigrationService: EmbeddingMigrationService,
    private readonly vectorSearchService: VectorSearchService,
  ) {}

  @Post('analyze-document')
  @ApiOperation({
    summary: 'Analyze document files using AI to generate metadata',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document analysis completed successfully',
  })
  async analyzeDocument(
    @Body() dto: AnalyzeDocumentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AIAnalysisResponse> {
    this.logger.log(
      `AI analysis requested by user ${req.user.id} for files: ${dto.fileIds.join(', ')}`,
    );

    const request: AIAnalysisRequest = {
      fileIds: dto.fileIds,
      userId: req.user.id,
    };

    return await this.aiService.analyzeDocuments(request);
  }

  @Get('analysis/:documentId')
  @ApiOperation({ summary: 'Get AI analysis for a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI analysis retrieved successfully',
  })
  async getAnalysis(@Param('documentId') documentId: string) {
    this.logger.log(`Getting AI analysis for document: ${documentId}`);

    return await this.aiService.getAnalysis(documentId);
  }

  @Post('apply-moderation/:documentId')
  @ApiOperation({ summary: 'Apply AI moderation settings to a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Moderation settings applied successfully',
  })
  async applyModeration(
    @Param('documentId') documentId: string,
    @Body() body: { moderationScore: number },
  ) {
    this.logger.log(
      `Applying moderation settings for document: ${documentId} with score: ${body.moderationScore}`,
    );

    return await this.aiService.applyModerationSettings(
      documentId,
      body.moderationScore,
    );
  }

  @Get('test-connection')
  @ApiOperation({ summary: 'Test AI service connections' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI service connection test results',
  })
  async testConnection() {
    this.logger.log('Testing AI service connections');

    return await this.aiService.testConnection();
  }

  @Get('my-files')
  @ApiOperation({
    summary: 'Get files that belong to the current user for AI analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User files retrieved successfully',
  })
  async getMyFiles(@Req() req: AuthenticatedRequest) {
    this.logger.log(`Getting files for user ${req.user.id}`);

    return await this.aiService.getUserFilesForAnalysis(req.user.id);
  }

  @Get('my-files/search')
  @ApiOperation({
    summary: 'Search user files by name for AI analysis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User files search results',
  })
  async searchMyFiles(
    @Req() req: AuthenticatedRequest,
    @Query('fileName') fileName: string,
  ) {
    this.logger.log(
      `Searching files for user ${req.user.id} with name: ${fileName}`,
    );

    if (!fileName || fileName.trim().length === 0) {
      return {
        success: false,
        files: [],
        count: 0,
        message: 'File name is required for search',
      };
    }

    return await this.aiService.findUserFilesByName(
      req.user.id,
      fileName.trim(),
    );
  }

  @Post('documents/:documentId/regenerate-embedding')
  @ApiOperation({
    summary: 'Regenerate embedding for a document',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Embedding regenerated successfully',
  })
  async regenerateEmbedding(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `Regenerating embedding for document ${documentId} by user ${req.user.id}`,
    );

    try {
      await this.aiService.regenerateEmbedding(documentId);

      return {
        success: true,
        documentId,
        embeddingDimension: this.embeddingService.getEmbeddingDimension(),
        message: 'Embedding regenerated successfully',
      };
    } catch (error: any) {
      this.logger.error('Error regenerating embedding:', error);
      return {
        success: false,
        documentId,
        message: `Failed to regenerate embedding: ${error.message}`,
      };
    }
  }

  @Get('search/metrics')
  @ApiOperation({
    summary: 'Get embedding and search metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully',
  })
  getMetrics(): {
    embedding: EmbeddingMetrics;
    search: SearchMetrics;
  } {
    this.logger.log('Getting embedding and search metrics');

    return {
      embedding: this.embeddingService.getMetrics(),
      search: this.vectorSearchService.getMetrics(),
    };
  }

  @Post('search/clear-cache')
  @ApiOperation({
    summary: 'Clear embedding and search caches',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Caches cleared successfully',
  })
  clearCaches() {
    this.logger.log('Clearing embedding and search caches');

    this.embeddingService.clearCache();
    this.vectorSearchService.clearCache();

    return {
      success: true,
      message: 'All caches cleared successfully',
    };
  }

  @Get('embeddings/status')
  @ApiOperation({
    summary: 'Get embedding model status and migration info',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Embedding model status retrieved successfully',
  })
  async getEmbeddingModelStatus(): Promise<EmbeddingMigrationStatus> {
    this.logger.log('Getting embedding model status');
    return await this.embeddingMigrationService.getEmbeddingModelStatus();
  }

  @Get('embeddings/regeneration-progress')
  @ApiOperation({
    summary: 'Get current embedding regeneration progress',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Regeneration progress retrieved successfully',
  })
  getRegenerationProgress(): {
    isRunning: boolean;
    progress: RegenerationProgress;
  } {
    this.logger.log('Getting embedding regeneration progress');
    return this.embeddingMigrationService.getRegenerationProgress();
  }

  @Post('embeddings/regenerate-outdated')
  @ApiOperation({
    summary: 'Regenerate all outdated embeddings (different model)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Regeneration started successfully',
  })
  regenerateOutdatedEmbeddings() {
    this.logger.log('Starting regeneration of outdated embeddings');
    return this.embeddingMigrationService.regenerateAllEmbeddings();
  }

  @Post('embeddings/force-regenerate-all')
  @ApiOperation({
    summary: 'Force regenerate ALL embeddings regardless of model',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Force regeneration started successfully',
  })
  async forceRegenerateAllEmbeddings() {
    this.logger.log('Starting force regeneration of all embeddings');
    return await this.embeddingMigrationService.forceRegenerateAllEmbeddings();
  }
}
