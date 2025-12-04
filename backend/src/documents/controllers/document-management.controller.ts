import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ResponseHelper } from '@/common/helpers/response.helper';
import { DocumentsService } from '@/documents/documents.service';
import { CreateDocumentDto } from '@/documents/dto/create-document.dto';
import { UpdateDocumentDto } from '@/documents/dto/update-document.dto';
import { AuthenticatedRequest } from '@/documents/interfaces';
import { FilesService } from '@/files/files.service';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentManagementController {
  private readonly logger = new Logger(DocumentManagementController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly filesService: FilesService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a document from uploaded files' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tài liệu đã được tạo thành công',
  })
  async createDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const document = await this.documentsService.createDocument(
        createDocumentDto,
        userId,
      );

      const responseMessage = document.isApproved
        ? 'Tài liệu đã được tạo thành công'
        : 'Tài liệu đã được tạo, vui lòng chờ quản trị viên duyệt';

      return ResponseHelper.success(
        res,
        document,
        responseMessage,
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error('Error creating document:', error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Đã xảy ra lỗi khi tạo tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('my')
  @ApiOperation({ summary: 'Get user documents with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu người dùng đã được truy xuất thành công',
  })
  async getUserDocuments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseHelper.error(
        res,
        'Không được ủy quyền',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    try {
      const documents = await this.documentsService.getUserDocuments(
        userId,
        pageNum,
        limitNum,
      );

      return ResponseHelper.success(
        res,
        documents,
        'Tài liệu đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error('Error getting user documents:', error);
      return ResponseHelper.error(
        res,
        'Không thể lấy tài liệu người dùng',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu đã được xóa thành công',
  })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.documentsService.deleteDocument(documentId, userId);

      return ResponseHelper.success(
        res,
        null,
        'Tài liệu đã được xóa thành công',
      );
    } catch (error) {
      this.logger.error(`Error deleting document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể xóa tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':documentId')
  @ApiOperation({ summary: 'Update a document (owner or admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tài liệu đã được cập nhật thành công',
  })
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role?.name;

      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const updatedDocument = await this.documentsService.updateDocument(
        documentId,
        userId,
        updateDocumentDto,
        userRole,
      );

      const message = updatedDocument.needsReModeration
        ? 'Tài liệu đã được cập nhật và cần kiểm duyệt lại'
        : 'Tài liệu đã được cập nhật thành công';

      return ResponseHelper.success(res, updatedDocument, message);
    } catch (error) {
      this.logger.error(`Error updating document ${documentId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể cập nhật tài liệu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('files/:fileId/secure-url')
  @ApiOperation({ summary: 'Get secure URL for file access' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'URL tệp bảo mật đã được truy xuất thành công',
  })
  async getSecureFileUrl(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHelper.error(
          res,
          'Không được ủy quyền',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const secureUrl = await this.filesService.getSecureFileUrl(
        fileId,
        userId,
      );

      return ResponseHelper.success(
        res,
        { secureUrl },
        'URL tệp bảo mật đã được truy xuất thành công',
      );
    } catch (error) {
      this.logger.error(`Error getting secure URL for file ${fileId}:`, error);

      if (error instanceof BadRequestException) {
        return ResponseHelper.error(res, error.message, HttpStatus.BAD_REQUEST);
      }

      return ResponseHelper.error(
        res,
        'Không thể lấy URL tệp bảo mật',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
