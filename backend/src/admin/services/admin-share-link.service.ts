import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ShareLinkFilters {
  readonly page?: number;
  readonly limit?: number;
  readonly documentId?: string;
  readonly createdById?: string;
  readonly isRevoked?: boolean;
  readonly isExpired?: boolean;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AdminShareLinkService {
  private readonly logger = new Logger(AdminShareLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getAllShareLinks(filters: ShareLinkFilters): Promise<{
    readonly shareLinks: Array<{
      readonly id: string;
      readonly documentId: string;
      readonly token: string;
      readonly expiresAt: Date;
      readonly isRevoked: boolean;
      readonly createdAt: Date;
      readonly updatedAt: Date;
      readonly document: {
        readonly id: string;
        readonly title: string;
        readonly uploaderId: string;
      };
      readonly createdBy: {
        readonly id: string;
        readonly username: string;
        readonly email: string;
        readonly firstName: string;
        readonly lastName: string;
      };
      readonly shareUrl: string;
      readonly isExpired: boolean;
    }>;
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        documentId,
        createdById,
        isRevoked,
        isExpired,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;
      const now = new Date();

      const where: any = {};

      if (documentId) {
        where.documentId = documentId;
      }

      if (createdById) {
        where.createdById = createdById;
      }

      if (typeof isRevoked === 'boolean') {
        where.isRevoked = isRevoked;
      }

      if (typeof isExpired === 'boolean') {
        if (isExpired) {
          where.expiresAt = { lt: now };
        } else {
          where.expiresAt = { gte: now };
        }
      }

      const allowedSortBy = ['createdAt', 'updatedAt', 'expiresAt'];
      const validSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt';
      const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      const orderBy: any = {};
      orderBy[validSortBy] = validSortOrder;

      const [shareLinks, total] = await Promise.all([
        this.prisma.documentShareLink.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            document: {
              select: {
                id: true,
                title: true,
                uploaderId: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.documentShareLink.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';

      const shareLinksWithUrl = shareLinks.map(link => ({
        id: link.id,
        documentId: link.documentId,
        token: link.token,
        expiresAt: link.expiresAt,
        isRevoked: link.isRevoked,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        document: link.document,
        createdBy: link.createdBy,
        shareUrl: `${frontendUrl}/documents/${link.documentId}?apiKey=${link.token}`,
        isExpired: link.expiresAt < now,
      }));

      return {
        shareLinks: shareLinksWithUrl,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get share links: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy danh sách liên kết chia sẻ',
      );
    }
  }

  async getShareLinkById(id: string): Promise<{
    readonly id: string;
    readonly documentId: string;
    readonly token: string;
    readonly expiresAt: Date;
    readonly isRevoked: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly document: {
      readonly id: string;
      readonly title: string;
      readonly uploaderId: string;
    };
    readonly createdBy: {
      readonly id: string;
      readonly username: string;
      readonly email: string;
      readonly firstName: string;
      readonly lastName: string;
    };
    readonly shareUrl: string;
    readonly isExpired: boolean;
  }> {
    try {
      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { id },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              uploaderId: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!shareLink) {
        throw new NotFoundException('Không tìm thấy liên kết chia sẻ');
      }

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      const now = new Date();

      return {
        id: shareLink.id,
        documentId: shareLink.documentId,
        token: shareLink.token,
        expiresAt: shareLink.expiresAt,
        isRevoked: shareLink.isRevoked,
        createdAt: shareLink.createdAt,
        updatedAt: shareLink.updatedAt,
        document: shareLink.document,
        createdBy: shareLink.createdBy,
        shareUrl: `${frontendUrl}/documents/${shareLink.documentId}?apiKey=${shareLink.token}`,
        isExpired: shareLink.expiresAt < now,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get share link ${id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy thông tin liên kết chia sẻ',
      );
    }
  }

  async revokeShareLink(id: string): Promise<void> {
    try {
      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { id },
      });

      if (!shareLink) {
        throw new NotFoundException('Không tìm thấy liên kết chia sẻ');
      }

      await this.prisma.documentShareLink.update({
        where: { id },
        data: { isRevoked: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to revoke share link ${id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể thu hồi liên kết chia sẻ',
      );
    }
  }

  async getShareLinkStats(): Promise<{
    readonly total: number;
    readonly active: number;
    readonly revoked: number;
    readonly expired: number;
  }> {
    try {
      const now = new Date();

      const [total, active, revoked, expired] = await Promise.all([
        this.prisma.documentShareLink.count(),
        this.prisma.documentShareLink.count({
          where: {
            isRevoked: false,
            expiresAt: { gte: now },
          },
        }),
        this.prisma.documentShareLink.count({
          where: {
            isRevoked: true,
          },
        }),
        this.prisma.documentShareLink.count({
          where: {
            expiresAt: { lt: now },
          },
        }),
      ]);

      return {
        total,
        active,
        revoked,
        expired,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get share link stats: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy thống kê liên kết chia sẻ',
      );
    }
  }
}
