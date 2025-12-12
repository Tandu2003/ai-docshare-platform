import { SystemSettingsService } from '../common/system-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Document, PointTxnReason, PointTxnType, Prisma } from '@prisma/client';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemSettingsService,
  ) {}
  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    if (!user) throw new BadRequestException('User not found');
    return { balance: user.pointsBalance };
  }

  async listTransactions(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.pointTransaction.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async listAllTransactions(options: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: PointTxnType;
    reason?: PointTxnReason;
    search?: string;
    from?: Date;
    to?: Date;
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PointTransactionWhereInput = {
      ...(options.userId ? { userId: options.userId } : {}),
      ...(options.type ? { type: options.type } : {}),
      ...(options.reason ? { reason: options.reason } : {}),
    };

    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) {
        where.createdAt.gte = options.from;
      }
      if (options.to) {
        where.createdAt.lte = options.to;
      }
    }

    if (options.search?.trim()) {
      const search = options.search.trim();
      where.OR = [
        {
          note: { contains: search, mode: 'insensitive' },
        },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          performedBy: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          document: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          document: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.pointTransaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async awardOnUpload(userId: string, documentId: string, amount?: number) {
    const settings = await this.systemSettings.getPointsSettings();
    const reward = amount ?? settings.uploadReward;
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: reward } },
        select: { pointsBalance: true },
      });
      await tx.pointTransaction.create({
        data: {
          userId,
          documentId,
          amount: reward,
          type: PointTxnType.EARN,
          reason: PointTxnReason.UPLOAD_REWARD,
          balanceAfter: user.pointsBalance,
          note: 'Thưởng cho việc tải lên tài liệu',
        },
      });
      return { balance: user.pointsBalance };
    });
  }

  async spendOnDownload(options: {
    userId: string;
    document: Document & { downloadCost: number };
    performedById?: string;
    bypass?: boolean;
  }) {
    const { userId, document, performedById, bypass } = options;
    const settings = await this.systemSettings.getPointsSettings();
    const cost = Math.max(0, document.downloadCost || settings.downloadCost);

    if (bypass) {
      // Log a bypass transaction without deduction
      await this.prisma.pointTransaction.create({
        data: {
          userId,
          documentId: document.id,
          amount: 0,
          type: PointTxnType.SPEND,
          reason: PointTxnReason.DOWNLOAD_COST,
          balanceAfter: (
            (await this.prisma.user.findUnique({
              where: { id: userId },
              select: { pointsBalance: true },
            })) as { pointsBalance: number }
          ).pointsBalance,
          performedById: performedById || null,
          isBypass: true,
          note: 'Tải tài liệu bỏ qua phí',
        },
      });
      return;
    }

    return this.prisma.$transaction(async tx => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      if (!current) throw new BadRequestException('User not found');
      if (current.pointsBalance < cost) {
        throw new BadRequestException(
          `Không đủ điểm để tải tài liệu. Bạn cần ${cost} điểm nhưng chỉ có ${current.pointsBalance} điểm.`,
        );
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: cost } },
        select: { pointsBalance: true },
      });
      await tx.pointTransaction.create({
        data: {
          userId,
          documentId: document.id,
          amount: -cost,
          type: PointTxnType.SPEND,
          reason: PointTxnReason.DOWNLOAD_COST,
          balanceAfter: updated.pointsBalance,
          performedById: performedById || null,
          note: 'Phí tải tài liệu',
        },
      });
      return { balance: updated.pointsBalance };
    });
  }

  async adminAdjust(
    adminId: string,
    userId: string,
    delta: number,
    note?: string,
  ) {
    return this.prisma.$transaction(async tx => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: delta } },
        select: { pointsBalance: true },
      });
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: delta,
          type: delta >= 0 ? PointTxnType.ADJUST : PointTxnType.ADJUST,
          reason: PointTxnReason.ADMIN_ADJUST,
          balanceAfter: updated.pointsBalance,
          performedById: adminId,
          note: note || 'Điều chỉnh bởi admin',
        },
      });
      return { balance: updated.pointsBalance };
    });
  }

  // New: Set absolute points balance for a user (admin only)
  async adminSetBalance(
    adminId: string,
    userId: string,
    newBalance: number,
    note?: string,
  ) {
    if (newBalance < 0) throw new BadRequestException('Điểm không hợp lệ');
    return this.prisma.$transaction(async tx => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      });
      if (!current) throw new BadRequestException('User not found');
      const delta = newBalance - current.pointsBalance;
      const updated = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: newBalance },
        select: { pointsBalance: true },
      });
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: delta,
          type: PointTxnType.ADJUST,
          reason: PointTxnReason.ADMIN_ADJUST,
          balanceAfter: updated.pointsBalance,
          performedById: adminId,
          note: note || 'Điều chỉnh bởi admin',
        },
      });
      return { balance: updated.pointsBalance };
    });
  }

  async awardUploaderOnDownload(
    uploaderId: string,
    documentId: string,
    downloaderId: string,
    downloadId: string,
    downloadCost: number,
  ) {
    try {
      // Don't reward if uploader downloads their own document
      if (uploaderId === downloaderId) {
        this.logger.log(
          `Bỏ qua thưởng: người tải lên ${uploaderId} tải tài liệu của chính mình`,
        );
        return null;
      }

      // Reward = what the downloader paid
      const reward = downloadCost;

      if (reward <= 0) {
        this.logger.log('Phí tải tài liệu là 0, bỏ qua thưởng');
        return null;
      }

      return this.prisma.$transaction(async tx => {
        // Check if this user has already generated a reward for this document
        // (prevents spam clicking from generating multiple rewards)
        const existingRewardedDownload = await tx.download.findFirst({
          where: {
            documentId,
            userId: downloaderId,
            success: true,
            uploaderRewarded: true,
          },
        });

        if (existingRewardedDownload) {
          this.logger.log(
            `Người dùng ${downloaderId} đã được thưởng cho tài liệu ${documentId}, bỏ qua`,
          );
          // Still mark this download as successful but not rewarded (it was already rewarded before)
          await tx.download.update({
            where: { id: downloadId },
            data: { success: true, uploaderRewarded: false },
          });
          return null;
        }

        // Award points to uploader
        const updatedUploader = await tx.user.update({
          where: { id: uploaderId },
          data: { pointsBalance: { increment: reward } },
          select: { pointsBalance: true },
        });

        // Create transaction record
        await tx.pointTransaction.create({
          data: {
            userId: uploaderId,
            documentId,
            amount: reward,
            type: PointTxnType.EARN,
            reason: PointTxnReason.DOWNLOAD_REWARD,
            balanceAfter: updatedUploader.pointsBalance,
            note: `Thưởng cho việc tải lên tài liệu: +${reward} điểm từ người dùng ${downloaderId}`,
          },
        });

        // Mark download as successful and rewarded
        await tx.download.update({
          where: { id: downloadId },
          data: { success: true, uploaderRewarded: true },
        });

        this.logger.log(
          `Thưởng ${reward} điểm cho người tải lên ${uploaderId} cho việc tải lên tài liệu ${documentId} bởi ${downloaderId}`,
        );

        return { balance: updatedUploader.pointsBalance };
      });
    } catch (error) {
      this.logger.error(
        `Lỗi khi thưởng điểm cho người tải lên ${uploaderId} cho việc tải lên tài liệu: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể thưởng điểm cho người tải lên',
      );
    }
  }

  async hasSuccessfulDownload(
    userId: string,
    documentId: string,
  ): Promise<boolean> {
    const existingDownload = await this.prisma.download.findFirst({
      where: {
        userId,
        documentId,
        success: true,
      },
    });
    return !!existingDownload;
  }
}
