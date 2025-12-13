import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentShareLink } from '@prisma/client';

interface ShareDocumentOptions {
  readonly expiresAt?: string;
  readonly expiresInMinutes?: number;
  readonly regenerateToken?: boolean;
}

/** Share link response */
interface ShareLinkResponse {
  readonly token: string;
  readonly expiresAt: string;
  readonly isRevoked: boolean;
  readonly shareUrl: string;
}

/** Validated share link */
interface ValidatedShareLink {
  readonly id: string;
  readonly token: string;
  readonly documentId: string;
  readonly expiresAt: Date;
  readonly isRevoked: boolean;
  readonly createdById: string;
}

@Injectable()
export class DocumentSharingService {
  private readonly logger = new Logger(DocumentSharingService.name);
  private readonly SHARE_TOKEN_BYTES = 32;
  private readonly DEFAULT_EXPIRY_MINUTES = 60 * 24; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createOrUpdateShareLink(
    documentId: string,
    userId: string,
    options: ShareDocumentOptions = {},
  ): Promise<ShareLinkResponse> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException(
          'Bạn không có quyền chia sẻ tài liệu này',
        );
      }

      // Public documents don't need share links
      if (document.isPublic) {
        throw new BadRequestException(
          'Tài liệu công khai không cần liên kết chia sẻ. Mọi người đều có thể xem.',
        );
      }

      const expiration = this.calculateExpiration(options);
      const tokenToUse = await this.determineToken(documentId, options);

      const shareLink = await this.prisma.documentShareLink.upsert({
        where: { documentId },
        update: {
          token: tokenToUse,
          expiresAt: expiration,
          isRevoked: false,
        },
        create: {
          documentId,
          token: tokenToUse,
          expiresAt: expiration,
          createdById: userId,
        },
      });

      const shareUrl = this.buildShareUrl(documentId, shareLink.token);

      return {
        token: shareLink.token,
        expiresAt: shareLink.expiresAt.toISOString(),
        isRevoked: shareLink.isRevoked,
        shareUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to create/update share link for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể tạo liên kết chia sẻ tài liệu',
      );
    }
  }

  async revokeShareLink(
    documentId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      if (document.uploaderId !== userId) {
        throw new BadRequestException(
          'Bạn không có quyền thu hồi liên kết chia sẻ này',
        );
      }

      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { documentId },
      });

      if (!shareLink) {
        throw new BadRequestException(
          'Không tìm thấy liên kết chia sẻ cho tài liệu này',
        );
      }

      await this.prisma.documentShareLink.update({
        where: { documentId },
        data: { isRevoked: true },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to revoke share link for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể thu hồi liên kết chia sẻ',
      );
    }
  }

  async validateShareLink(
    documentId: string,
    token: string,
  ): Promise<ValidatedShareLink | null> {
    try {
      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { documentId },
      });

      if (!shareLink) {
        return null;
      }

      if (shareLink.token !== token) {
        return null;
      }

      if (shareLink.isRevoked) {
        return null;
      }

      if (shareLink.expiresAt < new Date()) {
        return null;
      }

      return {
        id: shareLink.id,
        token: shareLink.token,
        documentId: shareLink.documentId,
        expiresAt: shareLink.expiresAt,
        isRevoked: shareLink.isRevoked,
        createdById: shareLink.createdById,
      };
    } catch {
      return null;
    }
  }

  async getShareLinkInfo(
    documentId: string,
    userId: string,
  ): Promise<ShareLinkResponse | null> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { uploaderId: true },
      });

      if (!document || document.uploaderId !== userId) {
        return null;
      }

      const shareLink = await this.prisma.documentShareLink.findUnique({
        where: { documentId },
      });

      if (!shareLink) {
        return null;
      }

      const shareUrl = this.buildShareUrl(documentId, shareLink.token);

      return {
        token: shareLink.token,
        expiresAt: shareLink.expiresAt.toISOString(),
        isRevoked: shareLink.isRevoked,
        shareUrl,
      };
    } catch {
      return null;
    }
  }

  async checkShareAccess(
    documentId: string,
    apiKey?: string,
  ): Promise<boolean> {
    if (!apiKey) {
      return false;
    }

    const shareLink = await this.validateShareLink(documentId, apiKey);
    return shareLink !== null;
  }

  async getActiveShareLink(
    documentId: string,
  ): Promise<DocumentShareLink | null> {
    const shareLink = await this.prisma.documentShareLink.findUnique({
      where: { documentId },
    });

    if (!shareLink || shareLink.isRevoked || shareLink.expiresAt < new Date()) {
      return null;
    }

    return shareLink;
  }

  // ============ Private Helper Methods ============

  private generateShareToken(): string {
    return randomBytes(this.SHARE_TOKEN_BYTES).toString('hex');
  }

  private calculateExpiration(options: ShareDocumentOptions): Date {
    const now = new Date();

    if (options.expiresAt) {
      const expiration = new Date(options.expiresAt);

      if (Number.isNaN(expiration.getTime())) {
        throw new BadRequestException('Thời gian hết hạn không hợp lệ');
      }

      if (expiration <= now) {
        throw new BadRequestException(
          'Thời gian hết hạn liên kết chia sẻ phải ở tương lai',
        );
      }

      return expiration;
    }

    const durationMinutes =
      options.expiresInMinutes && options.expiresInMinutes > 0
        ? options.expiresInMinutes
        : this.DEFAULT_EXPIRY_MINUTES;

    return new Date(now.getTime() + durationMinutes * 60 * 1000);
  }

  private async determineToken(
    documentId: string,
    options: ShareDocumentOptions,
  ): Promise<string> {
    if (options.regenerateToken) {
      return this.generateShareToken();
    }

    const existingShareLink = await this.prisma.documentShareLink.findUnique({
      where: { documentId },
    });

    return existingShareLink
      ? existingShareLink.token
      : this.generateShareToken();
  }

  private buildShareUrl(documentId: string, token: string): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    return `${frontendUrl}/documents/${documentId}?apiKey=${token}`;
  }

  async getShareLinksHistory(filters: {
    readonly page?: number;
    readonly limit?: number;
    readonly documentId?: string;
    readonly createdById?: string;
    readonly isRevoked?: boolean;
    readonly isExpired?: boolean;
    readonly sortBy?: string;
    readonly sortOrder?: 'asc' | 'desc';
  }): Promise<{
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
        shareUrl: this.buildShareUrl(link.documentId, link.token),
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
        `Failed to get share links history: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy lịch sử liên kết chia sẻ',
      );
    }
  }
}
