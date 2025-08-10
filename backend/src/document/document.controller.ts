import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  Request,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseHelper } from '@/common';
import { DocumentService } from './document.service';
import {
  SearchDocumentsDto,
  GetSuggestionsDto,
  GetRecommendationsDto,
  GetPopularDocumentsDto,
  GetRecentDocumentsDto,
  GetTrendingDocumentsDto,
  GetDocumentPreviewDto,
  UpdateDocumentDto,
  GetMyDocumentsDto,
  DuplicateCheckDto,
} from './dto';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // ================================
  // SEARCH & DISCOVERY
  // ================================

  @Get('search')
  async searchDocuments(
    @Query() searchDto: SearchDocumentsDto,
    @Request() req: any,
    @Res() res: Response
  ) {
    const userId = req.user?.id;
    const result = await this.documentService.searchDocuments(searchDto, userId);

    return ResponseHelper.success(res, result, 'Documents retrieved successfully');
  }

  @Get('suggestions')
  async getSuggestions(@Query() suggestionsDto: GetSuggestionsDto, @Res() res: Response) {
    const result = await this.documentService.getSuggestions(suggestionsDto);

    return ResponseHelper.success(res, result, 'Suggestions retrieved successfully');
  }

  @Get('recommendations')
  async getRecommendations(
    @Query() recommendationsDto: GetRecommendationsDto,
    @Request() req: any,
    @Res() res: Response
  ) {
    const userId = req.user?.id;
    const result = await this.documentService.getRecommendations(recommendationsDto, userId);

    return ResponseHelper.success(res, result, 'Recommendations retrieved successfully');
  }

  @Get('popular')
  async getPopularDocuments(@Query() popularDto: GetPopularDocumentsDto, @Res() res: Response) {
    const result = await this.documentService.getPopularDocuments(popularDto);

    return ResponseHelper.success(res, result, 'Popular documents retrieved successfully');
  }

  @Get('recent')
  async getRecentDocuments(@Query() recentDto: GetRecentDocumentsDto, @Res() res: Response) {
    const result = await this.documentService.getRecentDocuments(recentDto);

    return ResponseHelper.success(res, result, 'Recent documents retrieved successfully');
  }

  @Get('trending')
  async getTrendingDocuments(@Query() trendingDto: GetTrendingDocumentsDto, @Res() res: Response) {
    const result = await this.documentService.getTrendingDocuments(trendingDto);

    return ResponseHelper.success(res, result, 'Trending documents retrieved successfully');
  }

  // ================================
  // MANAGEMENT (Protected Routes) - Must come before :id routes
  // ================================

  @UseGuards(JwtAuthGuard)
  @Get('my-documents')
  async getMyDocuments(
    @Query() myDocsDto: GetMyDocumentsDto,
    @Request() req: any,
    @Res() res: Response
  ) {
    const userId = req.user.id;
    const result = await this.documentService.getMyDocuments(myDocsDto, userId);

    return ResponseHelper.success(res, result, 'My documents retrieved successfully');
  }

  // ================================
  // VIEW & DOWNLOAD
  // ================================

  @Get(':id')
  async getDocumentById(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id;
    const result = await this.documentService.getDocumentById(id, userId);

    return ResponseHelper.success(res, result, 'Document retrieved successfully');
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id;

    // Get document details first
    const document = await this.documentService.getDocumentById(id, userId);

    if (!document.canDownload) {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        message: 'Download not allowed',
      });
    }

    // In a real implementation, you would:
    // 1. Get the file from storage (R2, S3, etc.)
    // 2. Stream it to the client
    // 3. Record the download activity

    // Mock implementation - redirect to file URL
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.mimeType);

    // For now, redirect to the file path
    // In production, you'd stream the actual file
    return res.redirect(document.filePath);
  }

  @Get(':id/preview')
  async getDocumentPreview(
    @Param('id') id: string,
    @Query() previewDto: GetDocumentPreviewDto,
    @Request() req: any,
    @Res() res: Response
  ) {
    const userId = req.user?.id;
    const result = await this.documentService.getDocumentPreview(id, previewDto, userId);

    return ResponseHelper.success(res, result, 'Document preview generated successfully');
  }

  @Get(':id/ai-summary')
  async getDocumentAISummary(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id;
    const result = await this.documentService.getDocumentAISummary(id, userId);

    return ResponseHelper.success(res, result, 'AI summary retrieved successfully');
  }

  @Post(':id/view')
  async recordDocumentView(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user?.id;
    const result = await this.documentService.recordDocumentView(id, userId);

    return ResponseHelper.success(res, result, 'View recorded successfully');
  }

  // ================================
  // DOCUMENT UPDATE/DELETE (Protected Routes)
  // ================================

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentDto,
    @Request() req: any,
    @Res() res: Response
  ) {
    const userId = req.user.id;
    const result = await this.documentService.updateDocument(id, updateDto, userId);

    return ResponseHelper.updated(res, result, 'Document updated successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const userId = req.user.id;
    const result = await this.documentService.deleteDocument(id, userId);

    return ResponseHelper.deleted(res, 'Document deleted successfully');
  }

  @Post(':id/duplicate-check')
  async checkDuplicate(
    @Param('id') id: string,
    @Body() duplicateDto: DuplicateCheckDto,
    @Res() res: Response
  ) {
    const result = await this.documentService.checkDuplicate(duplicateDto);

    return ResponseHelper.success(res, result, 'Duplicate check completed');
  }
}
