import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIAnalysisRequest, AIAnalysisResponse, AIService } from './ai.service';
import { AnalyzeDocumentDto } from './dto';
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
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
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

  constructor(private readonly aiService: AIService) {}

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
}
