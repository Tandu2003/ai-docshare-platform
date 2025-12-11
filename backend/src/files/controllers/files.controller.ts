import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CloudflareR2Service } from '@/common/cloudflare-r2.service';
import { ResponseHelper } from '@/common/helpers/response.helper';
import {
  FastifyFilesInterceptor,
  MultipartFile,
} from '@/common/interceptors/fastify-file.interceptor';
import { FilesService } from '@/files/files.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    [key: string]: any;
  };
  uploadedFiles?: MultipartFile[];
}

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly r2Service: CloudflareR2Service,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload files to storage' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tệp đã được tải lên thành công',
  })
  @UseInterceptors(
    FastifyFilesInterceptor('files', 10, {
      maxFileSize: 100 * 1024 * 1024, // 100MB per file
    }),
  )
  async uploadFiles(
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user.id;
    const files = req.uploadedFiles || [];

    if (!files || files.length === 0) {
      throw new BadRequestException('Không có tệp nào được cung cấp');
    }

    try {
      const uploadResults = await this.filesService.uploadFiles(files, userId);

      return ResponseHelper.success(
        res,
        uploadResults,
        'Tệp đã được tải lên thành công',
        HttpStatus.CREATED,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi tải lên tệp',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload/avatar')
  @UseInterceptors(
    FastifyFilesInterceptor('avatar', 1, {
      maxFileSize: 5 * 1024 * 1024, // 5MB max for avatars
    }),
  )
  async uploadAvatar(
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ) {
    const userId = req.user.id;
    const files = req.uploadedFiles || [];

    if (!files || files.length === 0) {
      return ResponseHelper.error(
        res,
        'Không có tệp ảnh được cung cấp',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const uploadResult = await this.filesService.uploadAvatar(
        files[0],
        userId,
      );

      return ResponseHelper.success(
        res,
        uploadResult,
        'Ảnh đại diện đã được tải lên thành công',
        HttpStatus.CREATED,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi tải lên ảnh đại diện',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':fileId/secure-url')
  @ApiOperation({ summary: 'Get secure access URL for a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL tệp bảo mật đã được tạo thành công',
  })
  async getSecureFileUrl(
    @Param('fileId') fileId: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      // Get user ID if authenticated
      const userId = (req as any).user?.id;

      const secureUrl = await this.filesService.getSecureFileUrl(
        fileId,
        userId,
      );

      return ResponseHelper.success(
        res,
        { secureUrl },
        'URL tệp bảo mật đã được tạo',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể tạo URL tệp bảo mật',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
