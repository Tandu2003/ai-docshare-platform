import { Request, Response } from 'express';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPolicy } from '@/common/casl';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { ResponseHelper } from '../common/helpers/response.helper';
import { FilesService } from './files.service';
import { Public } from '@/auth/decorators/public.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly filesService: FilesService,
    private readonly r2Service: CloudflareR2Service
  ) {}

  @Post('upload')
  @CheckPolicy({ action: 'upload', subject: 'File' })
  @ApiOperation({ summary: 'Upload files to storage' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Files uploaded successfully',
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per file
      },
    })
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    try {
      this.logger.log(`Uploading ${files.length} files for user ${userId}`);

      const uploadResults = await this.filesService.uploadFiles(files, userId);

      return ResponseHelper.success(
        res,
        uploadResults,
        'Files uploaded successfully',
        HttpStatus.CREATED
      );
    } catch (error) {
      this.logger.error('Error uploading files:', error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'An error occurred while uploading files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':fileId/secure-url')
  @CheckPolicy({ action: 'read', subject: 'File' })
  @ApiOperation({ summary: 'Get secure access URL for a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Secure file URL generated successfully',
  })
  async getSecureFileUrl(
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      const secureUrl = await this.filesService.getSecureFileUrl(fileId, userId);

      return ResponseHelper.success(res, { secureUrl }, 'Secure file URL generated');
    } catch (error) {
      this.logger.error(`Failed to generate secure URL for file ${fileId}`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Could not generate secure file URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('my-files')
  @CheckPolicy({ action: 'read', subject: 'File' })
  @ApiOperation({ summary: 'Get user files with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User files retrieved successfully',
  })
  async getUserFiles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('mimeType') mimeType?: string
  ) {
    const userId = req.user.id;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

    try {
      const files = await this.filesService.getUserFiles(userId, pageNum, limitNum, mimeType);

      return ResponseHelper.success(res, files, 'User files retrieved successfully');
    } catch (error) {
      this.logger.error('Error getting user files:', error);
      return ResponseHelper.error(
        res,
        'Failed to get user files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('file/:fileId')
  @CheckPolicy({ action: 'read', subject: 'File' })
  @ApiOperation({ summary: 'Get file details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File details retrieved successfully',
  })
  async getFile(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    try {
      const file = await this.filesService.getFile(fileId);

      return ResponseHelper.success(res, file, 'File retrieved successfully');
    } catch (error) {
      this.logger.error(`Error getting file ${fileId}:`, error);

      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, 'File not found', HttpStatus.NOT_FOUND);
      }

      return ResponseHelper.error(res, 'Failed to get file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('download/:fileId')
  @CheckPolicy({ action: 'read', subject: 'File' })
  @ApiOperation({ summary: 'Get download URL for a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download URL generated successfully',
  })
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    try {
      const downloadUrl = await this.filesService.getDownloadUrl(fileId);

      return ResponseHelper.success(res, { downloadUrl }, 'Download URL generated successfully');
    } catch (error) {
      this.logger.error(`Error getting download URL for file ${fileId}:`, error);

      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, 'File not found', HttpStatus.NOT_FOUND);
      }

      return ResponseHelper.error(
        res,
        'Failed to get download URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('file/:fileId')
  @CheckPolicy({ action: 'delete', subject: 'File' })
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    try {
      await this.filesService.deleteFile(fileId, req.user.id);

      return ResponseHelper.success(res, null, 'File deleted successfully');
    } catch (error) {
      this.logger.error(`Error deleting file ${fileId}:`, error);

      if (error instanceof NotFoundException) {
        return ResponseHelper.error(res, 'File not found', HttpStatus.NOT_FOUND);
      }

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(res, 'Failed to delete file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
