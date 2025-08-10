import { Request, Response } from 'express'

import {
    BadRequestException, Body, Controller, Delete, Get, HttpStatus, Param, Post, Query, Req, Res,
    UploadedFiles, UseGuards, UseInterceptors
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { Public } from '../auth/decorators/public.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ResponseHelper } from '../common/helpers/response.helper'
import { CloudflareR2Service } from './cloudflare-r2.service'
import { UploadFileDto } from './dto/upload-file.dto'
import { UploadService } from './upload.service'

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly r2Service: CloudflareR2Service
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload files' })
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
    @Body() uploadData: UploadFileDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    try {
      // Transform isPublic from string to boolean if needed
      if (typeof uploadData.isPublic === 'string') {
        uploadData.isPublic = uploadData.isPublic === 'true';
      }

      console.log('Processing files upload with data:', {
        files: files.map((f) => ({ name: f.originalname, size: f.size, type: f.mimetype })),
        uploadData,
      });

      // Process single file or multiple files based on the number of files
      let result;
      if (files.length === 1) {
        // Single file upload
        result = await this.uploadService.uploadSingleFile(files[0], uploadData, userId);
      } else {
        // Multiple files upload
        result = await this.uploadService.uploadMultipleFiles(files, uploadData, userId);
      }

      console.log('Upload completed successfully');
      return ResponseHelper.success(res, result, 'Files uploaded successfully', HttpStatus.CREATED);
    } catch (error) {
      console.error('Error uploading files:', error);

      // Check if it's a BigInt serialization error
      if (
        error instanceof Error &&
        error.message.includes('BigInt') &&
        error.message.includes('serialize')
      ) {
        console.error('BigInt serialization error detected');

        // Log the error details
        console.error(error);

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          status: 'error',
          message: 'Error processing large file sizes',
          details: 'There was an issue handling the file size data',
        });
      }

      // Send a more user-friendly error response
      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          status: 'error',
          message: error.message,
        });
      }

      // For all other errors, send a 500 with some details
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'An error occurred while processing your upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // This code is no longer used as we've consolidated the endpoints
  }

  @Get('my-files')
  @ApiOperation({ summary: 'Get current user uploaded files' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files retrieved successfully',
  })
  async getMyFiles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('mimeType') mimeType: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await this.uploadService.getUserFiles(userId, pageNum, limitNum, mimeType);

    return ResponseHelper.success(res, result, 'Files retrieved successfully');
  }

  @Get('file/:fileId')
  @ApiOperation({ summary: 'Get file details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File details retrieved successfully',
  })
  async getFile(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;
    const file = await this.uploadService.getFile(fileId, userId);

    return ResponseHelper.success(res, file, 'File details retrieved successfully');
  }

  @Get('download/:fileId')
  @ApiOperation({ summary: 'Get download URL for file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download URL generated successfully',
  })
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;
    const downloadUrl = await this.uploadService.getDownloadUrl(fileId, userId);

    return ResponseHelper.success(res, { downloadUrl }, 'Download URL generated successfully');
  }

  @Delete('file/:fileId')
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
    const userId = req.user.id;
    await this.uploadService.deleteFile(fileId, userId);

    return ResponseHelper.success(res, null, 'File deleted successfully');
  }

  @Public()
  @Post('view/:fileId')
  @ApiOperation({ summary: 'Increment view count for a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'View count incremented successfully',
  })
  async incrementViewCount(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      await this.uploadService.incrementViewCount(fileId);
      return ResponseHelper.success(res, null, 'View count incremented');
    } catch (error) {
      // It's not critical if this fails, so we can just log it
      console.error(`Failed to increment view count for file ${fileId}`, error);
      // Still return a success response to not block the user
      return ResponseHelper.success(res, null, 'View count increment failed but proceeding');
    }
  }

  @Get('allowed-types')
  @ApiOperation({ summary: 'Get allowed file types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Allowed file types retrieved successfully',
  })
  getAllowedTypes(@Res() res: Response) {
    const allowedTypes = this.r2Service.getAllowedDocumentTypes();

    return ResponseHelper.success(
      res,
      { allowedTypes },
      'Allowed file types retrieved successfully'
    );
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get all public files' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public files retrieved successfully',
  })
  async getPublicFiles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('mimeType') mimeType: string,
    @Res() res: Response
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await this.uploadService.getPublicFiles(pageNum, limitNum, mimeType);

    return ResponseHelper.success(res, result, 'Public files retrieved successfully');
  }
}
