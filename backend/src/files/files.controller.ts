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
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { ResponseHelper } from '../common/helpers/response.helper';
import { FilesService } from './files.service';

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

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':fileId/secure-url')
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
}
