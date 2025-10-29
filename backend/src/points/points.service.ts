import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Document, PointTxnReason, PointTxnType } from '@prisma/client';

const UPLOAD_REWARD_DEFAULT = 5;

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

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
      }),
      this.prisma.pointTransaction.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async awardOnUpload(userId: string, documentId: string, amount?: number) {
    const reward = amount ?? UPLOAD_REWARD_DEFAULT;
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
          note: 'Award for uploading a document',
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
    const cost = Math.max(0, document.downloadCost || 1);

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
          note: 'Download bypassed deduction',
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
        throw new BadRequestException('Không đủ điểm để tải tài liệu');
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
          note: 'Download document deduction',
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
          note: note || 'Admin adjustment',
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
          note: note || 'Admin set balance',
        },
      });
      return { balance: updated.pointsBalance };
    });
  }
}
