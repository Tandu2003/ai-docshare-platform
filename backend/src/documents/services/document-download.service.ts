/**
 * @fileoverview Document Download Service
 * @description Handles document download operations including streaming and ZIP creation
 * @module documents/services/document-download
 */

import { Readable } from 'stream';
import { DocumentSharingService } from './document-sharing.service';
import { CloudflareR2Service } from '@/common/cloudflare-r2.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PointsService } from '@/points/points.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentModerationStatus } from '@prisma/client';
import archiver from 'archiver';

/** Download URL response */
interface DownloadUrlResponse {
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly fileCount: number;
}

/** Init download response */
interface InitDownloadResponse {
  readonly downloadId: string;
  readonly alreadyDownloaded: boolean;
}

/** Confirm download response */
interface ConfirmDownloadResponse {
  readonly success: boolean;
  readonly message: string;
}

/** Streaming download response */
interface StreamingDownloadResponse {
  readonly fileStream: Readable;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly downloadId: string;
  readonly uploaderId: string;
  readonly onStreamComplete: () => Promise<void>;
  readonly onStreamError: () => Promise<void>;
}

/** Document download info */
interface DocumentDownloadInfo {
  readonly document: {
    readonly id: string;
    readonly title: string;
    readonly description: string | null;
    readonly uploader: {
      readonly id: string;
      readonly username: string;
      readonly firstName: string | null;
      readonly lastName: string | null;
    };
    readonly category: { readonly id: string; readonly name: string } | null;
    readonly createdAt: Date;
  };
  readonly files: Array<{
    readonly id: string;
    readonly originalName: string;
    readonly fileName: string;
    readonly mimeType: string;
    readonly fileSize: bigint;
    readonly order: number;
  }>;
}

@Injectable()
export class DocumentDownloadService {
  private readonly logger = new Logger(DocumentDownloadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: CloudflareR2Service,
    private readonly configService: ConfigService,
    private readonly systemSettings: SystemSettingsService,
    private readonly notifications: NotificationsService,
    private readonly pointsService: PointsService,
    private readonly sharingService: DocumentSharingService,
  ) {}

  /**
   * Prepare document download with all its files
   * @param documentId - Document ID
   * @returns Document and files info
   */
  async prepareDocumentDownload(
    documentId: string,
  ): Promise<DocumentDownloadInfo> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          include: { file: true },
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
      throw new BadRequestException('Không tìm thấy tài liệu');
    }

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
      files: document.files.map(df => ({
        id: df.file.id,
        originalName: df.file.originalName,
        fileName: df.file.fileName,
        mimeType: df.file.mimeType,
        fileSize: df.file.fileSize,
        order: df.order,
      })),
    };
  }

  /**
   * Initialize a download - creates pending record
   * @param documentId - Document ID
   * @param userId - Optional user ID
   * @param ipAddress - Client IP
   * @param userAgent - Client user agent
   * @param referrer - Referrer URL
   * @returns Download ID and status
   */
  async initDownload(
    documentId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
  ): Promise<InitDownloadResponse> {
    try {
      this.logger.log(
        `Initializing download for document ${documentId} by user ${userId || 'guest'}`,
      );

      const document = await this.validateDownloadAccess(documentId, userId);
      const hasExistingDownload = await this.checkExistingDownload(
        documentId,
        userId,
      );

      // Pre-check points if needed
      if (userId && document.uploaderId !== userId && !hasExistingDownload) {
        await this.validateUserPoints(userId, document);
      }

      const download = await this.prisma.download.create({
        data: {
          userId: userId || null,
          documentId,
          ipAddress,
          userAgent,
          referrer,
          success: false,
          uploaderRewarded: false,
        },
      });

      this.logger.log(
        `Created pending download record ${download.id} for document ${documentId}`,
      );

      return {
        downloadId: download.id,
        alreadyDownloaded: hasExistingDownload,
      };
    } catch (error) {
      this.logger.error('Error initializing download:', error);
      throw error;
    }
  }

  /**
   * Confirm a download - marks successful and handles points
   * @param downloadId - Download record ID
   * @param userId - Optional user ID
   * @returns Confirmation status
   */
  async confirmDownload(
    downloadId: string,
    userId?: string,
  ): Promise<ConfirmDownloadResponse> {
    try {
      this.logger.log(
        `Confirming download ${downloadId} for user ${userId || 'guest'}`,
      );

      const download = await this.prisma.download.findUnique({
        where: { id: downloadId },
        include: {
          document: {
            select: {
              id: true,
              uploaderId: true,
              downloadCost: true,
            },
          },
        },
      });

      if (!download) {
        throw new BadRequestException('Không tìm thấy bản ghi tải xuống');
      }

      if (download.userId && download.userId !== userId) {
        throw new BadRequestException(
          'Bạn không có quyền xác nhận tải xuống này',
        );
      }

      if (download.success) {
        this.logger.log(`Download ${downloadId} already confirmed, skipping`);
        return {
          success: true,
          message: 'Tải xuống đã được xác nhận trước đó',
        };
      }

      const isOwner = download.document.uploaderId === userId;
      const hasOtherDownload = await this.checkOtherSuccessfulDownload(
        download.documentId,
        userId,
        downloadId,
      );

      // Deduct points if applicable
      if (userId && !isOwner && !hasOtherDownload) {
        await this.deductDownloadPoints(userId, download.document);
      }

      // Update records
      await this.finalizeDownload(
        downloadId,
        download.documentId,
        isOwner,
        hasOtherDownload,
      );

      // Award uploader and notify
      if (userId && !isOwner && !hasOtherDownload) {
        await this.rewardUploader(
          download.document.uploaderId,
          download.documentId,
          userId,
          downloadId,
          download.document.downloadCost,
        );
      }

      this.logger.log(
        `Successfully confirmed download ${downloadId}${isOwner ? ' (owner)' : hasOtherDownload ? ' (re-download)' : ''}`,
      );

      return {
        success: true,
        message: hasOtherDownload
          ? 'Tải xuống đã được xác nhận (tải lại)'
          : 'Tải xuống đã được xác nhận thành công',
      };
    } catch (error) {
      this.logger.error('Error confirming download:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending download
   * @param downloadId - Download record ID
   * @param userId - Optional user ID
   * @returns Success status
   */
  async cancelDownload(
    downloadId: string,
    userId?: string,
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(
        `Cancelling download ${downloadId} for user ${userId || 'guest'}`,
      );

      const download = await this.prisma.download.findUnique({
        where: { id: downloadId },
      });

      if (!download) {
        return { success: true };
      }

      if (download.userId && download.userId !== userId) {
        throw new BadRequestException('Bạn không có quyền hủy tải xuống này');
      }

      if (download.success) {
        this.logger.log(
          `Download ${downloadId} already successful, cannot cancel`,
        );
        return { success: false };
      }

      await this.prisma.download.update({
        where: { id: downloadId },
        data: { success: false },
      });

      this.logger.log(`Download ${downloadId} cancelled`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error cancelling download:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a document
   * @param documentId - Document ID
   * @param userId - Optional user ID
   * @returns Download URL info
   */
  async getDownloadUrl(
    documentId: string,
    userId?: string,
  ): Promise<DownloadUrlResponse> {
    try {
      this.logger.log(
        `Getting download URL for document ${documentId} by user ${userId || 'guest'}`,
      );

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: { file: true },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      this.validateDocumentAccess(document, userId);

      if (!document.files || document.files.length === 0) {
        throw new BadRequestException('Tài liệu không có tệp để tải xuống');
      }

      if (document.files.length === 1) {
        return this.getSingleFileDownload(document.files[0].file, document);
      }

      return this.getZipDownload(document);
    } catch (error) {
      this.logger.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Prepare streaming download
   * @param documentId - Document ID
   * @param userId - User ID
   * @param ipAddress - Client IP
   * @param userAgent - Client user agent
   * @param referrer - Referrer URL
   * @param apiKey - Share link API key
   * @returns Streaming download data
   */
  async prepareStreamingDownload(
    documentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string,
    apiKey?: string,
  ): Promise<StreamingDownloadResponse> {
    try {
      this.logger.log(
        `Preparing streaming download for document ${documentId} by user ${userId}`,
      );

      const document = await this.getDocumentForStreaming(documentId);
      const shareAccessGranted = await this.sharingService.checkShareAccess(
        documentId,
        apiKey,
      );

      this.validateStreamingAccess(document, userId, shareAccessGranted);

      if (document.files.length > 1) {
        throw new BadRequestException(
          'Streaming download chỉ hỗ trợ tài liệu đơn tệp',
        );
      }

      const isOwner = document.uploaderId === userId;
      const hasExistingDownload =
        await this.pointsService.hasSuccessfulDownload(userId, documentId);

      // Handle points deduction
      if (!isOwner && !hasExistingDownload) {
        await this.handleStreamingPoints(userId, document, shareAccessGranted);
      }

      const download = await this.prisma.download.create({
        data: {
          userId,
          documentId,
          ipAddress,
          userAgent,
          referrer,
          success: false,
          uploaderRewarded: false,
        },
      });

      const file = document.files[0].file;
      const fileStream = await this.r2Service.getFileStream(file.storageUrl);

      return {
        fileStream,
        fileName: file.originalName,
        mimeType: file.mimeType,
        fileSize: Number(file.fileSize),
        downloadId: download.id,
        uploaderId: document.uploaderId,
        onStreamComplete: this.createStreamCompleteHandler(
          download.id,
          documentId,
          document.uploaderId,
          userId,
          document.downloadCost,
        ),
        onStreamError: this.createStreamErrorHandler(download.id),
      };
    } catch (error) {
      this.logger.error(
        `Error preparing streaming download for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Không thể chuẩn bị tải xuống tài liệu',
      );
    }
  }

  /**
   * Get effective download cost for a document
   * @param documentId - Document ID
   * @returns Effective download cost
   */
  async getEffectiveDownloadCost(documentId: string): Promise<number> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { downloadCost: true },
    });

    if (
      document?.downloadCost !== null &&
      document?.downloadCost !== undefined
    ) {
      return document.downloadCost;
    }

    const settings = await this.systemSettings.getPointsSettings();
    return settings.downloadCost;
  }

  // ============ Private Helper Methods ============

  private async validateDownloadAccess(
    documentId: string,
    userId?: string,
  ): Promise<{
    uploaderId: string;
    isPublic: boolean;
    isApproved: boolean;
    moderationStatus: DocumentModerationStatus;
    downloadCost: number | null;
  }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        isPublic: true,
        isApproved: true,
        moderationStatus: true,
        uploaderId: true,
        downloadCost: true,
      },
    });

    if (!document) {
      throw new BadRequestException('Không tìm thấy tài liệu');
    }

    const isOwner = document.uploaderId === userId;

    if (document.isPublic) {
      if (!document.isApproved && !isOwner) {
        throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
      }
      if (
        document.moderationStatus === DocumentModerationStatus.REJECTED &&
        !isOwner
      ) {
        throw new BadRequestException('Tài liệu đã bị từ chối');
      }
    } else {
      if (!userId) {
        throw new BadRequestException(
          'Cần xác thực để tải xuống tài liệu riêng tư',
        );
      }
      if (!isOwner) {
        throw new BadRequestException(
          'Bạn không có quyền tải xuống tài liệu này',
        );
      }
    }

    return document;
  }

  private async checkExistingDownload(
    documentId: string,
    userId?: string,
  ): Promise<boolean> {
    if (!userId) return false;

    const existingDownload = await this.prisma.download.findFirst({
      where: { userId, documentId, success: true },
    });

    return !!existingDownload;
  }

  private async checkOtherSuccessfulDownload(
    documentId: string,
    userId?: string,
    excludeDownloadId?: string,
  ): Promise<boolean> {
    if (!userId) return false;

    const otherDownload = await this.prisma.download.findFirst({
      where: {
        userId,
        documentId,
        success: true,
        id: excludeDownloadId ? { not: excludeDownloadId } : undefined,
      },
    });

    return !!otherDownload;
  }

  private async validateUserPoints(
    userId: string,
    document: { downloadCost: number | null },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pointsBalance: true,
        role: { select: { name: true } },
      },
    });

    if (user?.role?.name === 'admin') return;

    const settings = await this.systemSettings.getPointsSettings();
    const effectiveDownloadCost =
      document.downloadCost ?? settings.downloadCost;

    if ((user?.pointsBalance ?? 0) < effectiveDownloadCost) {
      throw new BadRequestException(
        `Bạn không đủ điểm để tải xuống tài liệu này. Cần ${effectiveDownloadCost} điểm, bạn có ${user?.pointsBalance ?? 0} điểm.`,
      );
    }
  }

  private async deductDownloadPoints(
    userId: string,
    document: { id?: string; downloadCost: number | null },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { name: true } } },
    });

    if (user?.role?.name === 'admin') return;

    await this.pointsService.spendOnDownload({
      userId,
      document: document as any,
      performedById: undefined,
      bypass: false,
    });
  }

  private async finalizeDownload(
    downloadId: string,
    documentId: string,
    isOwner: boolean,
    hasOtherDownload: boolean,
  ): Promise<void> {
    await this.prisma.$transaction(async prisma => {
      await prisma.download.update({
        where: { id: downloadId },
        data: { success: true },
      });

      if (!isOwner && !hasOtherDownload) {
        await prisma.document.update({
          where: { id: documentId },
          data: { downloadCount: { increment: 1 } },
        });
      }
    });
  }

  private async rewardUploader(
    uploaderId: string,
    documentId: string,
    downloaderId: string,
    downloadId: string,
    downloadCost: number | null,
  ): Promise<void> {
    try {
      let effectiveDownloadCost = downloadCost;

      if (
        effectiveDownloadCost === null ||
        effectiveDownloadCost === undefined
      ) {
        const settings = await this.systemSettings.getPointsSettings();
        effectiveDownloadCost = settings.downloadCost;
      }

      await this.pointsService.awardUploaderOnDownload(
        uploaderId,
        documentId,
        downloaderId,
        downloadId,
        effectiveDownloadCost,
      );

      void this.notifications.emitToUploaderOfDocument(uploaderId, {
        type: 'download',
        documentId,
        userId: downloaderId,
        count: 1,
      });
    } catch (error) {
      this.logger.error(
        `Failed to reward uploader for download ${downloadId}:`,
        error,
      );
    }
  }

  private validateDocumentAccess(document: any, userId?: string): void {
    const isOwner = document.uploaderId === userId;

    if (document.isPublic) {
      if (!document.isApproved && !isOwner) {
        throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
      }
      if (
        document.moderationStatus === DocumentModerationStatus.REJECTED &&
        !isOwner
      ) {
        throw new BadRequestException('Tài liệu đã bị từ chối');
      }
    } else {
      if (!userId) {
        throw new BadRequestException(
          'Cần xác thực để tải xuống tài liệu riêng tư',
        );
      }
      if (!isOwner) {
        throw new BadRequestException(
          'Bạn không có quyền tải xuống tài liệu này',
        );
      }
    }
  }

  private async getSingleFileDownload(
    file: any,
    document: any,
  ): Promise<DownloadUrlResponse> {
    this.logger.log(`Preparing single file download: ${file.originalName}`);

    const downloadUrl = await this.r2Service.getSignedDownloadUrl(
      file.storageUrl,
      300,
    );

    return {
      downloadUrl,
      fileName: file.originalName,
      fileCount: 1,
    };
  }

  private async getZipDownload(document: any): Promise<DownloadUrlResponse> {
    this.logger.log(
      `Preparing ZIP download for ${document.files.length} files`,
    );

    if (document.zipFileUrl) {
      this.logger.log(`Using cached ZIP file for document ${document.id}`);

      const zipDownloadUrl = await this.r2Service.getSignedDownloadUrl(
        document.zipFileUrl,
        1800,
      );

      return {
        downloadUrl: zipDownloadUrl,
        fileName: `${document.title || 'document'}.zip`,
        fileCount: document.files.length,
      };
    }

    const zipUrl = await this.createZipDownload(document.files, document.id);

    return {
      downloadUrl: zipUrl,
      fileName: `${document.title || 'document'}.zip`,
      fileCount: document.files.length,
    };
  }

  private async createZipDownload(
    files: any[],
    documentId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Creating new ZIP file for document ${documentId} with ${files.length} files`,
      );

      if (files.length === 0) {
        throw new Error('No files to zip');
      }

      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', chunk => chunks.push(chunk));

      const zipPromise = new Promise<Buffer>((resolve, reject) => {
        archive.on('end', () => {
          const zipBuffer = Buffer.concat(chunks);
          this.logger.log(
            `ZIP created successfully, size: ${zipBuffer.length} bytes`,
          );
          resolve(zipBuffer);
        });

        archive.on('error', error => {
          this.logger.error('ZIP creation error:', error);
          reject(error);
        });
      });

      for (const fileData of files) {
        try {
          const file = fileData.file || fileData;
          this.logger.log(`Adding file to ZIP: ${file.originalName}`);

          const fileStream = await this.r2Service.getFileStream(
            file.storageUrl,
          );
          archive.append(fileStream, { name: file.originalName });
        } catch (fileError) {
          this.logger.error(`Error adding file to ZIP:`, fileError);
        }
      }

      await archive.finalize();
      const zipBuffer = await zipPromise;

      const zipKey = `downloads/zip-${Date.now()}-${Math.random().toString(36).substring(7)}.zip`;
      await this.r2Service.uploadBuffer(zipBuffer, zipKey, 'application/zip');

      const publicUrl = this.configService.get<string>(
        'CLOUDFLARE_R2_PUBLIC_URL',
      );
      const storageUrl = publicUrl
        ? `${publicUrl}/${zipKey}`
        : `${this.configService.get('CLOUDFLARE_R2_ENDPOINT')}/${this.r2Service.bucketName}/${zipKey}`;

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          zipFileUrl: storageUrl,
          zipFileCreatedAt: new Date(),
        },
      });

      const zipUrl = await this.r2Service.getSignedDownloadUrl(
        storageUrl,
        1800,
      );

      this.logger.log(`ZIP uploaded and cached for document ${documentId}`);

      return zipUrl;
    } catch (error) {
      this.logger.error('Error creating ZIP download:', error);
      throw new InternalServerErrorException('Không thể tạo tải xuống ZIP');
    }
  }

  private async getDocumentForStreaming(documentId: string): Promise<any> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        uploaderId: true,
        isPublic: true,
        isApproved: true,
        moderationStatus: true,
        downloadCost: true,
        files: {
          include: { file: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      throw new BadRequestException('Không tìm thấy tài liệu');
    }

    if (!document.files || document.files.length === 0) {
      throw new BadRequestException('Tài liệu không có tệp để tải xuống');
    }

    return document;
  }

  private validateStreamingAccess(
    document: any,
    userId: string,
    shareAccessGranted: boolean,
  ): void {
    const isOwner = document.uploaderId === userId;

    if (document.isPublic) {
      if (!document.isApproved && !isOwner) {
        throw new BadRequestException('Tài liệu đang chờ kiểm duyệt');
      }
      if (
        document.moderationStatus === DocumentModerationStatus.REJECTED &&
        !isOwner
      ) {
        throw new BadRequestException('Tài liệu đã bị từ chối');
      }
    } else {
      if (!isOwner && !shareAccessGranted) {
        throw new BadRequestException(
          'Bạn không có quyền tải xuống tài liệu này',
        );
      }
    }
  }

  private async handleStreamingPoints(
    userId: string,
    document: any,
    shareAccessGranted: boolean,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { name: true } } },
    });

    const isAdmin = user?.role?.name === 'admin';
    const bypass = Boolean(isAdmin || shareAccessGranted);

    try {
      await this.pointsService.spendOnDownload({
        userId,
        document: document,
        performedById: isAdmin ? userId : undefined,
        bypass,
      });
    } catch (e) {
      if (!bypass) throw e;
    }
  }

  private createStreamCompleteHandler(
    downloadId: string,
    documentId: string,
    uploaderId: string,
    userId: string,
    downloadCost: number | null,
  ): () => Promise<void> {
    return async () => {
      try {
        this.logger.log(`Stream completed for download ${downloadId}`);

        await this.prisma.document.update({
          where: { id: documentId },
          data: { downloadCount: { increment: 1 } },
        });

        let effectiveDownloadCost = downloadCost;
        if (
          effectiveDownloadCost === null ||
          effectiveDownloadCost === undefined
        ) {
          const settings = await this.systemSettings.getPointsSettings();
          effectiveDownloadCost = settings.downloadCost;
        }

        await this.pointsService.awardUploaderOnDownload(
          uploaderId,
          documentId,
          userId,
          downloadId,
          effectiveDownloadCost,
        );

        void this.notifications.emitToUploaderOfDocument(uploaderId, {
          type: 'download',
          documentId,
          userId,
          count: 1,
        });

        this.logger.log(`Download ${downloadId} completed successfully`);
      } catch (error) {
        this.logger.error(
          `Error in onStreamComplete for download ${downloadId}:`,
          error,
        );
      }
    };
  }

  private createStreamErrorHandler(downloadId: string): () => Promise<void> {
    return async () => {
      try {
        this.logger.log(`Stream failed for download ${downloadId}`);

        await this.prisma.download.update({
          where: { id: downloadId },
          data: { success: false },
        });
      } catch (error) {
        this.logger.error(
          `Error in onStreamError for download ${downloadId}:`,
          error,
        );
      }
    };
  }
}
