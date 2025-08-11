import { Request, Response } from 'express';

import {
  BadRequestException,
  Body,
  Controller,
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

import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  @Public()
  @Post('download/:fileId')
  @ApiOperation({ summary: 'Get download URL for a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download URL generated successfully',
  })
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const downloadUrl = await this.filesService.getDownloadUrl(fileId);

      return ResponseHelper.success(res, { downloadUrl }, 'Download URL generated');
    } catch (error) {
      this.logger.error(`Failed to generate download URL for file ${fileId}`, error);
      return ResponseHelper.error(
        res,
        'Could not generate download URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
