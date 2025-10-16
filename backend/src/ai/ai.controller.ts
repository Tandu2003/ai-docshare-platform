import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckPolicy } from '../common/casl/casl.decorator';
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
  @CheckPolicy({ action: 'read', subject: 'Document' })
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
  @CheckPolicy({ action: 'read', subject: 'Document' })
  @ApiOperation({ summary: 'Get AI analysis for a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI analysis retrieved successfully',
  })
  async getAnalysis(@Param('documentId') documentId: string) {
    this.logger.log(`Getting AI analysis for document: ${documentId}`);

    return await this.aiService.getAnalysis(documentId);
  }

  @Get('test-connection')
  @CheckPolicy({ action: 'read', subject: 'User' })
  @ApiOperation({ summary: 'Test AI service connections' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI service connection test results',
  })
  async testConnection() {
    this.logger.log('Testing AI service connections');

    return await this.aiService.testConnection();
  }
}
