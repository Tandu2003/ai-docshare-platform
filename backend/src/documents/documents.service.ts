import {
    BadRequestException, Injectable, InternalServerErrorException, Logger
} from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { CreateDocumentDto } from './dto/create-document.dto'

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a document from uploaded files
   */
  async createDocument(createDocumentDto: CreateDocumentDto, userId: string) {
    try {
      const {
        title,
        description,
        fileIds,
        categoryId,
        isPublic = false,
        tags = [],
        language = 'en',
      } = createDocumentDto;

      this.logger.log(`Creating document for user ${userId} with files: ${fileIds.join(', ')}`);

      // Validate that all files exist and belong to the user
      const files = await this.prisma.file.findMany({
        where: {
          id: { in: fileIds },
          uploaderId: userId,
        },
      });

      if (files.length !== fileIds.length) {
        this.logger.error(
          `Files validation failed. Found ${files.length} files, expected ${fileIds.length}`
        );
        throw new BadRequestException('Some files not found or do not belong to the user');
      }

      this.logger.log(
        `Files validated successfully: ${files.map((f) => f.originalName).join(', ')}`
      );

      // Get or create default category
      const category = categoryId
        ? await this.prisma.category.findUnique({ where: { id: categoryId } })
        : await this.getOrCreateDefaultCategory();

      if (!category) {
        this.logger.error(`Category not found: ${categoryId}`);
        throw new BadRequestException('Category not found');
      }

      this.logger.log(`Using category: ${category.name} (${category.id})`);

      // Create one document with multiple files
      const document = await this.prisma.document.create({
        data: {
          title,
          description,
          uploaderId: userId,
          categoryId: category.id,
          isPublic,
          tags,
          language,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          category: true,
        },
      });

      this.logger.log(`Document created successfully: ${document.id}`);

      // Create DocumentFile relationships
      const documentFiles = await Promise.all(
        files.map((file, index) =>
          this.prisma.documentFile.create({
            data: {
              documentId: document.id,
              fileId: file.id,
              order: index,
            },
            include: {
              file: true,
            },
          })
        )
      );

      this.logger.log(`Document-file relationships created: ${documentFiles.length} files`);

      // Update files to mark them as public if document is public
      if (isPublic) {
        await this.prisma.file.updateMany({
          where: { id: { in: fileIds } },
          data: { isPublic: true },
        });
      }

      // Return document with files
      const result = {
        ...document,
        files: documentFiles.map((df) => df.file),
      };

      this.logger.log(`Document creation completed successfully: ${document.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating document:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while creating document');
    }
  }

  /**
   * Prepare document download with all its files
   */
  async prepareDocumentDownload(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          include: {
            file: true,
          },
          orderBy: { order: 'asc' },
        },
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        category: true,
      },
    });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    // Increment download count
    await this.prisma.document.update({
      where: { id: documentId },
      data: { downloadCount: { increment: 1 } },
    });

    return {
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        uploader: document.uploader,
        category: document.category,
        createdAt: document.createdAt,
      },
      files: document.files.map((df) => ({
        id: df.file.id,
        originalName: df.file.originalName,
        fileName: df.file.fileName,
        mimeType: df.file.mimeType,
        fileSize: df.file.fileSize,
        storageUrl: df.file.storageUrl,
        order: df.order,
      })),
    };
  }

  /**
   * Get or create default category
   */
  private async getOrCreateDefaultCategory() {
    let category = await this.prisma.category.findFirst({
      where: { name: 'General' },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          name: 'General',
          description: 'Default category for documents',
          isActive: true,
          documentCount: 0,
          sortOrder: 0,
        },
      });
    }

    return category;
  }

  /**
   * Get user's documents with pagination
   */
  async getUserDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      this.logger.log(`Getting documents for user ${userId}, page ${page}, limit ${limit}`);

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: { uploaderId: userId },
          include: {
            files: {
              include: {
                file: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            category: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.document.count({
          where: { uploaderId: userId },
        }),
      ]);

      // Transform the data to include file details
      const transformedDocuments = documents.map((document) => ({
        id: document.id,
        title: document.title,
        description: document.description,
        isPublic: document.isPublic,
        tags: document.tags,
        language: document.language,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        uploaderId: document.uploaderId,
        categoryId: document.categoryId,
        category: document.category,
        files: document.files.map((df) => ({
          id: df.file.id,
          originalName: df.file.originalName,
          fileName: df.file.fileName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          storageUrl: df.file.storageUrl,
          order: df.order,
        })),
      }));

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error getting user documents:', error);
      throw new InternalServerErrorException('Failed to get user documents');
    }
  }
}
