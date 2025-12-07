import { Readable } from 'stream';
import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentModerationStatus } from '@prisma/client';

export interface DocumentAccessResult {
  allowed: boolean;
  reason?: string;
  accessType?: 'owner' | 'public' | 'share_link' | 'admin';
}
export interface SecureDownloadResult {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  expiresAt: Date;
}

@Injectable()
export class SecureDocumentService {
  private readonly logger = new Logger(SecureDocumentService.name);

  // Short-lived URL durations (in seconds)
  private readonly PREVIEW_URL_EXPIRY = 30; // 30 seconds for preview images
  private readonly DOWNLOAD_URL_EXPIRY = 30; // 30 seconds for download initiation
  private readonly STREAM_BUFFER_TIME = 300; // 5 minutes for streaming buffer

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly configService: ConfigService,
  ) {}

  async validateDocumentAccess(
    documentId: string,
    userId?: string,
    apiKey?: string,
    accessLevel: 'preview' | 'download' | 'full' = 'preview',
  ): Promise<DocumentAccessResult> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          shareLink: true,
          uploader: {
            select: { id: true },
          },
        },
      });

      if (!document) {
        return { allowed: false, reason: 'Document not found' };
      }

      // Owner always has full access
      if (userId && document.uploaderId === userId) {
        return { allowed: true, accessType: 'owner' };
      }

      // Check admin access
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { role: true },
        });

        if (user?.role?.name === 'admin') {
          return { allowed: true, accessType: 'admin' };
        }
      }

      // Check share link access
      if (apiKey && document.shareLink) {
        const shareLink = document.shareLink;
        if (
          shareLink.token === apiKey &&
          !shareLink.isRevoked &&
          shareLink.expiresAt > new Date()
        ) {
          // Share link valid - grant preview access, maybe download
          if (accessLevel === 'preview') {
            return { allowed: true, accessType: 'share_link' };
          }
          // For download via share link, allow it
          if (accessLevel === 'download') {
            return { allowed: true, accessType: 'share_link' };
          }
        }
      }

      // Public document access
      if (document.isPublic) {
        // Must be approved for non-owners
        if (document.moderationStatus !== DocumentModerationStatus.APPROVED) {
          return { allowed: false, reason: 'Document pending approval' };
        }

        if (!document.isApproved) {
          return { allowed: false, reason: 'Document not approved' };
        }

        // Preview is free for public documents
        if (accessLevel === 'preview') {
          return { allowed: true, accessType: 'public' };
        }

        // Download requires authentication and may require points
        if (accessLevel === 'download' || accessLevel === 'full') {
          if (!userId) {
            return {
              allowed: false,
              reason: 'Authentication required for download',
            };
          }
          return { allowed: true, accessType: 'public' };
        }
      }

      // Private document - only owner has access (checked above)
      return { allowed: false, reason: 'Access denied' };
    } catch (error) {
      this.logger.error(
        `Error validating document access: ${error.message}`,
        error.stack,
      );
      return { allowed: false, reason: 'Access validation failed' };
    }
  }

  async isDocumentOwner(documentId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { uploaderId: true },
    });

    return document?.uploaderId === userId;
  }

  async getSecureDownloadUrl(
    documentId: string,
    userId: string,
    apiKey?: string,
  ): Promise<SecureDownloadResult> {
    // Validate access first
    const access = await this.validateDocumentAccess(
      documentId,
      userId,
      apiKey,
      'download',
    );

    if (!access.allowed) {
      throw new BadRequestException(access.reason || 'Access denied');
    }

    // Get document with files
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          include: { file: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document || document.files.length === 0) {
      throw new NotFoundException('Document or files not found');
    }

    // For single file, return direct URL
    if (document.files.length === 1) {
      const file = document.files[0].file;
      const signedUrl = await this.r2Service.getSignedDownloadUrl(
        file.storageUrl,
        this.DOWNLOAD_URL_EXPIRY,
      );

      return {
        url: signedUrl,
        fileName: file.originalName,
        mimeType: file.mimeType,
        fileSize: Number(file.fileSize),
        expiresAt: new Date(Date.now() + this.DOWNLOAD_URL_EXPIRY * 1000),
      };
    }

    // For multiple files, check if ZIP exists or create one
    if (document.zipFileUrl) {
      const signedUrl = await this.r2Service.getSignedDownloadUrl(
        document.zipFileUrl,
        this.DOWNLOAD_URL_EXPIRY,
      );

      return {
        url: signedUrl,
        fileName: `${document.title}.zip`,
        mimeType: 'application/zip',
        fileSize: 0, // Unknown for ZIP
        expiresAt: new Date(Date.now() + this.DOWNLOAD_URL_EXPIRY * 1000),
      };
    }

    throw new BadRequestException(
      'Document download not ready. Please try again.',
    );
  }

  async streamDocumentFile(
    documentId: string,
    fileIndex: number,
    userId?: string,
    apiKey?: string,
  ): Promise<{
    stream: Readable;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }> {
    // Validate access
    const access = await this.validateDocumentAccess(
      documentId,
      userId,
      apiKey,
      'download',
    );

    if (!access.allowed) {
      throw new BadRequestException(access.reason || 'Access denied');
    }

    // Get document with files
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          include: { file: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document || document.files.length === 0) {
      throw new NotFoundException('Document or files not found');
    }

    if (fileIndex < 0 || fileIndex >= document.files.length) {
      throw new BadRequestException('Invalid file index');
    }

    const file = document.files[fileIndex].file;
    const stream = await this.r2Service.getFileStream(file.storageUrl);

    return {
      stream,
      fileName: file.originalName,
      mimeType: file.mimeType,
      fileSize: Number(file.fileSize),
    };
  }

  async generateDownloadToken(
    documentId: string,
    userId: string,
  ): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.DOWNLOAD_URL_EXPIRY * 1000);

    // Store token temporarily (in-memory cache or Redis would be better)
    // For now, we'll encode info in the token itself
    const tokenData = {
      documentId,
      userId,
      expiresAt: expiresAt.toISOString(),
      nonce: token,
    };

    // Base64 encode the token data
    const encodedToken = Buffer.from(JSON.stringify(tokenData)).toString(
      'base64url',
    );

    return {
      token: encodedToken,
      expiresAt,
    };
  }

  validateDownloadToken(token: string): {
    valid: boolean;
    documentId?: string;
    userId?: string;
    reason?: string;
  } {
    try {
      const decoded = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf-8'),
      );

      if (!decoded.documentId || !decoded.expiresAt) {
        return { valid: false, reason: 'Invalid token format' };
      }

      const expiresAt = new Date(decoded.expiresAt);
      if (expiresAt <= new Date()) {
        return { valid: false, reason: 'Token expired' };
      }

      return {
        valid: true,
        documentId: decoded.documentId,
        userId: decoded.userId,
      };
    } catch {
      return { valid: false, reason: 'Invalid token' };
    }
  }
}
