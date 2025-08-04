import { Request, Response } from 'express'

import {
    BadRequestException, Body, Controller, Delete, Get, HttpStatus, Param, Post, Query, Req, Res,
    UploadedFile, UploadedFiles, UseGuards, UseInterceptors
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

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

  @Post('single')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    })
  )
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadData: UploadFileDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Transform isPublic from string to boolean if needed
    if (typeof uploadData.isPublic === 'string') {
      uploadData.isPublic = uploadData.isPublic === 'true';
    }

    const result = await this.uploadService.uploadSingleFile(file, uploadData, userId);

    return ResponseHelper.success(res, result, 'File uploaded successfully', HttpStatus.CREATED);
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
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
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadData: UploadFileDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    const userId = req.user.id;

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Transform isPublic from string to boolean if needed
    if (typeof uploadData.isPublic === 'string') {
      uploadData.isPublic = uploadData.isPublic === 'true';
      console.log(`Transformed isPublic to boolean: ${uploadData.isPublic}`);
    }

    const results = await this.uploadService.uploadMultipleFiles(files, uploadData, userId);

    return ResponseHelper.success(res, results, 'Files uploaded successfully', HttpStatus.CREATED);
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

  @Get('allowed-types')
  @ApiOperation({ summary: 'Get allowed file types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Allowed file types retrieved successfully',
  })
  async getAllowedTypes(@Res() res: Response) {
    const allowedTypes = this.r2Service.getAllowedDocumentTypes();

    return ResponseHelper.success(
      res,
      { allowedTypes },
      'Allowed file types retrieved successfully'
    );
  }
}
