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
      this.logger.error(
        `Error creating/updating share link for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) throw error;
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

      this.logger.log(`Share link revoked for document ${documentId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error revoking share link for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) throw error;
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
    } catch (error) {
      this.logger.error(
        `Error validating share link for document ${documentId}:`,
        error,
      );
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
    } catch (error) {
      this.logger.error(
        `Error getting share link info for document ${documentId}:`,
        error,
      );
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
}
