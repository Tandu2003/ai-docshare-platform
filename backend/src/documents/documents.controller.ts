import { Request, Response } from 'express';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseHelper } from '../common/helpers/response.helper';
import { FilesService } from '../files/files.service';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ViewDocumentDto } from './dto/view-document.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a document from uploaded files' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document created successfully',
  })
  async createDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;

    try {
      const document = await this.documentsService.createDocument(createDocumentDto, userId);

      return ResponseHelper.success(
        res,
        document,
        'Document created successfully',
        HttpStatus.CREATED
      );
    } catch (error) {
      this.logger.error('Error creating document:', error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'An error occurred while creating document',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Post('download/:documentId')
  @ApiOperation({ summary: 'Download all files of a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document files download prepared',
  })
  async downloadDocument(@Param('documentId') documentId: string, @Res() res: Response) {
    try {
      const downloadData = await this.documentsService.prepareDocumentDownload(documentId);

      return ResponseHelper.success(res, downloadData, 'Document download prepared');
    } catch (error) {
      this.logger.error(`Failed to prepare download for document ${documentId}`, error);
      return ResponseHelper.error(
        res,
        'Could not prepare document download',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public documents with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public documents retrieved successfully',
  })
  async getPublicDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Res() res: Response
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

      const result = await this.documentsService.getPublicDocuments(pageNum, limitNum);

      return ResponseHelper.success(res, result, 'Public documents retrieved successfully');
    } catch (error) {
      this.logger.error('Error getting public documents:', error);
      return ResponseHelper.error(
        res,
        'An error occurred while retrieving public documents',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('my')
  @ApiOperation({ summary: 'Get user documents with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User documents retrieved successfully',
  })
  async getUserDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    try {
      const documents = await this.documentsService.getUserDocuments(userId, pageNum, limitNum);

      return ResponseHelper.success(res, documents, 'Documents retrieved successfully');
    } catch (error) {
      this.logger.error('Error getting user documents:', error);
      return ResponseHelper.error(
        res,
        'Failed to get user documents',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document details retrieved successfully',
  })
  async getDocumentById(
    @Param('documentId') documentId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      const document = await this.documentsService.getDocumentById(documentId, userId);

      return ResponseHelper.success(res, document, 'Document retrieved successfully');
    } catch (error) {
      this.logger.error(`Error getting document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(res, 'Failed to get document', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Post(':documentId/view')
  @ApiOperation({ summary: 'Track document view' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document view tracked successfully',
  })
  async viewDocument(
    @Param('documentId') documentId: string,
    @Body() viewDocumentDto: ViewDocumentDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Get user ID if authenticated
      const userId = (req as any).user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const { referrer } = viewDocumentDto;

      const result = await this.documentsService.viewDocument(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer
      );

      return ResponseHelper.success(res, result, 'Document view tracked successfully');
    } catch (error) {
      this.logger.error(`Error tracking view for document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Failed to track document view',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @Get('upload/allowed-types')
  @ApiOperation({ summary: 'Get allowed file types for upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Allowed file types retrieved successfully',
  })
  async getAllowedFileTypes(@Res() res: Response) {
    try {
      const allowedTypes = this.filesService.getAllowedTypes();
      return ResponseHelper.success(res, allowedTypes, 'Allowed file types retrieved successfully');
    } catch (error) {
      this.logger.error('Error getting allowed file types:', error);
      return ResponseHelper.error(
        res,
        'Failed to get allowed file types',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
