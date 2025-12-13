import { DocumentSharingService } from './document-sharing.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { FilesService } from '@/files/files.service';
import { PreviewService } from '@/preview/preview.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DocumentModerationStatus } from '@prisma/client';

/** Validated share link type from DocumentSharingService */
interface ValidatedShareLink {
  readonly id: string;
  readonly token: string;
  readonly documentId: string;
  readonly expiresAt: Date;
  readonly isRevoked: boolean;
  readonly createdById: string;
}

/** Document list filters */
interface DocumentListFilters {
  readonly categoryId?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/** Admin document list filters */
interface AdminDocumentListFilters {
  readonly categoryIds?: string[];
  readonly isPublic?: boolean | 'all';
  readonly moderationStatus?: DocumentModerationStatus | 'all';
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/** Paginated document response */
interface PaginatedDocumentsResponse {
  readonly documents: TransformedDocument[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

/** Transformed document for API response */
interface TransformedDocument {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublic: boolean;
  readonly isApproved: boolean;
  readonly moderationStatus: DocumentModerationStatus;
  readonly tags: string[];
  readonly language: string;
  readonly createdAt: string | Date;
  readonly updatedAt: string | Date;
  readonly uploaderId: string;
  readonly categoryId: string | null;
  readonly category: any;
  readonly downloadCount: number;
  readonly viewCount: number;
  readonly averageRating: number | null;
  readonly files: any[];
  readonly uploader?: any;
  readonly downloadCost?: number;
  readonly totalRatings?: number;
  readonly isPremium?: boolean;
  readonly isDraft?: boolean;
  readonly moderatedAt?: string | null;
  readonly moderatedById?: string | null;
  readonly moderationNotes?: string | null;
  readonly rejectionReason?: string | null;
}

/** Document detail response */
interface DocumentDetailResponse extends TransformedDocument {
  readonly stats: {
    readonly ratingsCount: number;
    readonly commentsCount: number;
    readonly viewsCount: number;
    readonly downloadsCount: number;
  };
  readonly aiAnalysis: unknown;
  readonly previews?: any[];
  readonly previewStatus?: string;
  readonly previewCount?: number;
  readonly shareLink?: {
    readonly token?: string;
    readonly expiresAt: string;
    readonly isRevoked?: boolean;
  };
  readonly originalDownloadCost?: number | null;
  readonly systemDefaultDownloadCost?: number;
}

/** View tracking response */
interface ViewTrackingResponse {
  readonly success: boolean;
  readonly message: string;
}

@Injectable()
export class DocumentQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly systemSettings: SystemSettingsService,
    private readonly sharingService: DocumentSharingService,
    @Inject(forwardRef(() => PreviewService))
    private readonly previewService: PreviewService,
  ) {}

  async getUserDocuments(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedDocumentsResponse> {
    try {
      const skip = (page - 1) * limit;

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: { uploaderId: userId },
          include: {
            files: {
              include: { file: true },
              orderBy: { order: 'asc' },
            },
            category: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.document.count({ where: { uploaderId: userId } }),
      ]);

      const transformedDocuments = await this.transformUserDocuments(
        documents,
        userId,
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch {
      throw new InternalServerErrorException(
        'Không thể lấy tài liệu người dùng',
      );
    }
  }

  async getPublicDocuments(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    userRole?: string,
    filters?: DocumentListFilters,
  ): Promise<PaginatedDocumentsResponse> {
    try {
      const skip = (page - 1) * limit;

      const whereCondition = await this.buildPublicDocumentsWhere(filters);
      const orderBy = this.buildOrderBy(filters);

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: whereCondition,
          include: {
            files: {
              include: { file: true },
              orderBy: { order: 'asc' },
            },
            category: true,
            uploader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.document.count({ where: whereCondition }),
      ]);

      const transformedDocuments = await this.transformPublicDocuments(
        documents,
        userId,
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch {
      throw new InternalServerErrorException(
        'Không thể lấy tài liệu công khai',
      );
    }
  }

  async getPrivateDocuments(
    page: number = 1,
    limit: number = 10,
    filters?: DocumentListFilters,
  ): Promise<PaginatedDocumentsResponse> {
    try {
      const skip = (page - 1) * limit;

      const whereCondition: any = {
        isPublic: false,
        isApproved: true,
        moderationStatus: DocumentModerationStatus.APPROVED,
      };

      if (filters?.categoryId) {
        const childCategories = await this.prisma.category.findMany({
          where: { parentId: filters.categoryId, isActive: true },
          select: { id: true },
        });

        const categoryIds = [
          filters.categoryId,
          ...childCategories.map(c => c.id),
        ];

        whereCondition.categoryId = { in: categoryIds };
      }

      const orderBy = this.buildOrderBy(filters);

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: whereCondition,
          include: {
            files: {
              include: { file: true },
              orderBy: { order: 'asc' },
            },
            category: true,
            uploader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.document.count({ where: whereCondition }),
      ]);

      const transformedDocuments = await this.transformPublicDocuments(
        documents,
        undefined,
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch {
      throw new InternalServerErrorException('Không thể lấy tài liệu riêng tư');
    }
  }

  async getAllDocuments(
    page: number = 1,
    limit: number = 10,
    filters?: AdminDocumentListFilters,
  ): Promise<PaginatedDocumentsResponse> {
    try {
      const skip = (page - 1) * limit;

      const whereCondition: any = {};

      // Filter by document mode (public/private)
      if (filters?.isPublic !== undefined && filters.isPublic !== 'all') {
        whereCondition.isPublic = filters.isPublic === true;
      }

      // Filter by moderation status
      if (
        filters?.moderationStatus !== undefined &&
        filters.moderationStatus !== 'all'
      ) {
        whereCondition.moderationStatus = filters.moderationStatus;
      }

      // Filter by categories (multi-select)
      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        const allCategoryIds: string[] = [];

        for (const categoryId of filters.categoryIds) {
          const childCategories = await this.prisma.category.findMany({
            where: { parentId: categoryId, isActive: true },
            select: { id: true },
          });

          allCategoryIds.push(categoryId);
          allCategoryIds.push(...childCategories.map(c => c.id));
        }

        whereCondition.categoryId = {
          in: [...new Set(allCategoryIds)],
        };
      }

      const orderBy = this.buildOrderBy(filters);

      const [documents, total] = await Promise.all([
        this.prisma.document.findMany({
          where: whereCondition,
          include: {
            files: {
              include: { file: true },
              orderBy: { order: 'asc' },
            },
            category: true,
            uploader: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.document.count({ where: whereCondition }),
      ]);

      const transformedDocuments = await this.transformPublicDocuments(
        documents,
        undefined,
      );

      return {
        documents: transformedDocuments,
        total,
        page,
        limit,
      };
    } catch {
      throw new InternalServerErrorException(
        'Không thể lấy danh sách tài liệu',
      );
    }
  }

  async getDocumentById(
    documentId: string,
    userId?: string,
    shareToken?: string,
    apiKey?: string,
  ): Promise<DocumentDetailResponse> {
    try {
      const document = await this.fetchDocumentWithRelations(documentId);

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      const accessInfo = await this.validateDocumentAccess(
        document,
        userId,
        shareToken,
        apiKey,
      );

      return this.buildDocumentDetailResponse(document, userId, accessInfo);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Không thể lấy tài liệu');
    }
  }

  async viewDocument(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<ViewTrackingResponse> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          isPublic: true,
          uploaderId: true,
          viewCount: true,
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      // Check admin access
      let isAdmin = false;
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { role: true },
        });
        isAdmin = user?.role?.name === 'admin';
      }

      if (!document.isPublic && document.uploaderId !== userId && !isAdmin) {
        throw new BadRequestException('Tài liệu không công khai');
      }

      await this.createViewRecord(
        documentId,
        userId,
        ipAddress,
        userAgent,
        referrer,
      );
      await this.incrementViewCount(documentId);

      return {
        success: true,
        message: 'View tracked successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể theo dõi lượt xem tài liệu',
      );
    }
  }

  // ============ Private Helper Methods ============

  private async buildPublicDocumentsWhere(
    filters?: DocumentListFilters,
  ): Promise<any> {
    const whereCondition: any = {
      isPublic: true,
      isApproved: true,
      moderationStatus: DocumentModerationStatus.APPROVED,
    };

    if (filters?.categoryId) {
      // Get child categories to include documents from sub-categories
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: filters.categoryId, isActive: true },
        select: { id: true },
      });

      const categoryIds = [
        filters.categoryId,
        ...childCategories.map(c => c.id),
      ];

      whereCondition.categoryId = { in: categoryIds };
    }

    return whereCondition;
  }

  private buildOrderBy(
    filters?: DocumentListFilters | AdminDocumentListFilters,
  ): any {
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';
    return { [sortBy]: sortOrder };
  }

  private async transformUserDocuments(
    documents: any[],
    userId: string,
  ): Promise<TransformedDocument[]> {
    return Promise.all(
      documents.map(async document => {
        const filesData = document.files.map((df: any) => ({
          id: df.file.id,
          originalName: df.file.originalName,
          fileName: df.file.fileName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          order: df.order,
        }));

        const filesWithSecureUrls =
          await this.filesService.addSecureUrlsToFiles(filesData, { userId });

        return {
          id: document.id,
          title: document.title,
          description: document.description,
          isPublic: document.isPublic,
          isApproved: document.isApproved,
          moderationStatus: document.moderationStatus,
          moderatedAt: document.moderatedAt?.toISOString() ?? null,
          moderatedById: document.moderatedById,
          moderationNotes: document.moderationNotes,
          rejectionReason: document.rejectionReason,
          isPremium: document.isPremium,
          isDraft: document.isDraft,
          tags: document.tags,
          language: document.language,
          createdAt: document.createdAt?.toISOString(),
          updatedAt: document.updatedAt?.toISOString(),
          uploaderId: document.uploaderId,
          categoryId: document.categoryId,
          category: document.category,
          downloadCount: document.downloadCount,
          viewCount: document.viewCount,
          averageRating: document.averageRating,
          totalRatings: document.totalRatings,
          files: filesWithSecureUrls,
        };
      }),
    );
  }

  private async transformPublicDocuments(
    documents: any[],
    userId?: string,
  ): Promise<TransformedDocument[]> {
    const settings = await this.systemSettings.getPointsSettings();

    return Promise.all(
      documents.map(async document => {
        const filesData = document.files.map((df: any) => ({
          id: df.file.id,
          originalName: df.file.originalName,
          fileName: df.file.fileName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          order: df.order,
        }));

        const filesWithSecureUrls =
          await this.filesService.addSecureUrlsToFiles(filesData, { userId });

        const isOwner = document.uploaderId === userId;
        const downloadCost = document.downloadCost ?? settings.downloadCost;

        return {
          id: document.id,
          title: document.title,
          description: document.description,
          isPublic: document.isPublic,
          isApproved: document.isApproved,
          moderationStatus: document.moderationStatus,
          tags: document.tags,
          language: document.language,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          uploaderId: document.uploaderId,
          categoryId: document.categoryId,
          category: document.category,
          uploader: document.uploader,
          downloadCount: document.downloadCount,
          downloadCost: isOwner ? 0 : downloadCost,
          viewCount: document.viewCount,
          averageRating: document.averageRating,
          files: filesWithSecureUrls,
        };
      }),
    );
  }

  private async fetchDocumentWithRelations(documentId: string): Promise<any> {
    return this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: true,
        files: {
          include: { file: true },
          orderBy: { order: 'asc' },
        },
        shareLink: true,
        aiAnalysis: true,
        _count: {
          select: {
            ratings: true,
            comments: true,
            views: true,
            downloads: true,
          },
        },
      },
    });
  }

  private async validateDocumentAccess(
    document: any,
    userId?: string,
    shareToken?: string,
    apiKey?: string,
  ): Promise<{
    isOwner: boolean;
    shareAccessGranted: boolean;
    activeShareLink: ValidatedShareLink | null;
    isApiKeyAccess: boolean;
  }> {
    const isOwner = document.uploaderId === userId;
    let shareAccessGranted = false;
    let activeShareLink: ValidatedShareLink | null = null;
    let isApiKeyAccess = false;
    let isAdmin = false;

    // Check admin access
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      isAdmin = user?.role?.name === 'admin';
    }

    if (shareToken) {
      activeShareLink = await this.sharingService.validateShareLink(
        document.id,
        shareToken,
      );
      shareAccessGranted = activeShareLink !== null;
    }

    // Check apiKey (share link token) - validate the share link
    if (apiKey) {
      // If user is owner or admin, allow access regardless of apiKey validation
      if (isOwner || isAdmin) {
        isApiKeyAccess = true;
      } else {
        // For non-owners, validate the share link token
        const validatedLink = await this.sharingService.validateShareLink(
          document.id,
          apiKey,
        );
        if (validatedLink) {
          shareAccessGranted = true;
          activeShareLink = validatedLink;
          isApiKeyAccess = true;
        } else if (!document.isPublic) {
          // Only throw error for private documents with invalid apiKey
          throw new BadRequestException(
            'Liên kết chia sẻ không hợp lệ hoặc đã hết hạn',
          );
        }
      }
    }

    // Check access permissions - admin has full access
    if (
      !document.isPublic &&
      !isOwner &&
      !isAdmin &&
      !shareAccessGranted &&
      !isApiKeyAccess
    ) {
      throw new BadRequestException('Tài liệu không công khai');
    }

    if (
      document.isPublic &&
      !document.isApproved &&
      !isOwner &&
      !isAdmin &&
      !shareAccessGranted &&
      !isApiKeyAccess
    ) {
      throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
    }

    if (
      document.moderationStatus === DocumentModerationStatus.REJECTED &&
      !isOwner &&
      !isAdmin
    ) {
      throw new BadRequestException('Tài liệu đã bị từ chối');
    }

    return { isOwner, shareAccessGranted, activeShareLink, isApiKeyAccess };
  }

  private async buildDocumentDetailResponse(
    document: any,
    userId?: string,
    accessInfo?: {
      isOwner: boolean;
      shareAccessGranted: boolean;
      activeShareLink: ValidatedShareLink | null;
    },
  ): Promise<DocumentDetailResponse> {
    const { isOwner, shareAccessGranted, activeShareLink } = accessInfo ?? {
      isOwner: document.uploaderId === userId,
      shareAccessGranted: false,
      activeShareLink: null,
    };

    // Prepare files with secure URLs
    const filesData =
      document.files?.map((df: any) => ({
        id: df.file.id,
        originalName: df.file.originalName,
        fileName: df.file.fileName,
        mimeType: df.file.mimeType,
        fileSize: df.file.fileSize,
        thumbnailUrl: df.file.thumbnailUrl,
        order: df.order,
      })) ?? [];

    const filesWithSecureUrls = await this.filesService.addSecureUrlsToFiles(
      filesData,
      {
        userId,
        allowSharedAccess: isOwner || shareAccessGranted,
      },
    );

    // Get download cost settings
    const settings = await this.systemSettings.getPointsSettings();
    const effectiveDownloadCost =
      document.downloadCost ?? settings.downloadCost;

    // Count non-deleted comments
    const commentsCount = await this.prisma.comment.count({
      where: {
        documentId: document.id,
        isDeleted: false,
      },
    });

    const response: any = {
      id: document.id,
      title: document.title,
      description: document.description,
      tags: document.tags,
      language: document.language,
      isPublic: document.isPublic,
      isPremium: document.isPremium,
      isApproved: document.isApproved,
      moderationStatus: document.moderationStatus,
      moderationNotes: document.moderationNotes,
      rejectionReason: document.rejectionReason,
      moderatedAt: document.moderatedAt?.toISOString() ?? null,
      moderatedById: document.moderatedById,
      viewCount: document.viewCount,
      downloadCount: document.downloadCount,
      downloadCost: isOwner ? 0 : effectiveDownloadCost,
      ...(isOwner && {
        originalDownloadCost: document.downloadCost,
        systemDefaultDownloadCost: settings.downloadCost,
      }),
      averageRating: document.averageRating,
      totalRatings: document.totalRatings,
      createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date().toISOString(),
      uploaderId: document.uploaderId,
      categoryId: document.categoryId,
      uploader: document.uploader,
      category: document.category,
      files: filesWithSecureUrls,
      stats: {
        ratingsCount: document._count?.ratings ?? 0,
        commentsCount,
        viewsCount: document._count?.views ?? 0,
        downloadsCount: document._count?.downloads ?? 0,
      },
      aiAnalysis: document.aiAnalysis ?? null,
    };

    // Add preview information
    await this.addPreviewInfo(response, document.id);

    // Add share link info
    this.addShareLinkInfo(
      response,
      document,
      isOwner,
      shareAccessGranted,
      activeShareLink,
    );

    return response;
  }

  private async addPreviewInfo(
    response: any,
    documentId: string,
  ): Promise<void> {
    try {
      const previews =
        await this.previewService.getDocumentPreviews(documentId);
      const previewStatus =
        await this.previewService.getPreviewStatus(documentId);
      response.previews = previews;
      response.previewStatus = previewStatus.status;
      response.previewCount = previewStatus.previewCount;
    } catch {
      response.previews = [];
      response.previewStatus = 'PENDING';
      response.previewCount = 0;
    }
  }

  private addShareLinkInfo(
    response: any,
    document: any,
    isOwner: boolean,
    shareAccessGranted: boolean,
    activeShareLink: ValidatedShareLink | null,
  ): void {
    if (isOwner && document.shareLink) {
      response.shareLink = {
        token: document.shareLink.token,
        expiresAt: document.shareLink.expiresAt.toISOString(),
        isRevoked: document.shareLink.isRevoked,
      };
    } else if (shareAccessGranted && activeShareLink) {
      response.shareLink = {
        expiresAt: activeShareLink.expiresAt.toISOString(),
      };
    }
  }

  private async createViewRecord(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<void> {
    await this.prisma.view.create({
      data: {
        documentId,
        userId: userId ?? null,
        ipAddress,
        userAgent,
        referrer,
      },
    });
  }

  private async incrementViewCount(documentId: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { viewCount: { increment: 1 } },
    });
  }
}
