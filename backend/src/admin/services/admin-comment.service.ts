import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface CommentFilters {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly documentId?: string;
  readonly userId?: string;
  readonly isDeleted?: boolean;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

const commentWithRelations = Prisma.validator<Prisma.CommentDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    },
    document: {
      select: {
        id: true,
        title: true,
      },
    },
    parent: {
      select: {
        id: true,
        content: true,
      },
    },
    _count: {
      select: {
        replies: true,
      },
    },
  },
});

type CommentWithRelations = Prisma.CommentGetPayload<
  typeof commentWithRelations
>;

interface CommentStats {
  readonly total: number;
  readonly active: number;
  readonly deleted: number;
  readonly withReplies: number;
  readonly averageLikes: number;
}

@Injectable()
export class AdminCommentService {
  private readonly logger = new Logger(AdminCommentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllComments(filters: CommentFilters): Promise<{
    readonly comments: CommentWithRelations[];
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        documentId,
        userId,
        isDeleted,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (typeof isDeleted === 'boolean') {
        where.isDeleted = isDeleted;
      }

      if (documentId) {
        where.documentId = documentId;
      }

      if (userId) {
        where.userId = userId;
      }

      if (search) {
        where.content = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const allowedSortBy = ['createdAt', 'updatedAt', 'likesCount'];
      const validSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'createdAt';
      const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      const orderBy: any = {};
      orderBy[validSortBy] = validSortOrder;

      const [comments, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          ...commentWithRelations,
        }),
        this.prisma.comment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        comments,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get comments: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy danh sách bình luận',
      );
    }
  }

  async getCommentById(id: string): Promise<CommentWithRelations> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        ...commentWithRelations,
      });

      if (!comment) {
        throw new NotFoundException('Không tìm thấy bình luận');
      }

      return comment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get comment ${id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy thông tin bình luận',
      );
    }
  }

  async deleteComment(id: string, hardDelete: boolean = false): Promise<void> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });

      if (!comment) {
        throw new NotFoundException('Không tìm thấy bình luận');
      }

      if (hardDelete) {
        if (comment._count.replies > 0) {
          throw new BadRequestException(
            'Không thể xóa vĩnh viễn bình luận có phản hồi. Vui lòng xóa mềm.',
          );
        }

        await this.prisma.comment.delete({
          where: { id },
        });
      } else {
        await this.prisma.comment.update({
          where: { id },
          data: { isDeleted: true },
        });
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to delete comment ${id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Không thể xóa bình luận');
    }
  }

  async restoreComment(id: string): Promise<void> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
      });

      if (!comment) {
        throw new NotFoundException('Không tìm thấy bình luận');
      }

      if (!comment.isDeleted) {
        throw new BadRequestException('Bình luận chưa bị xóa');
      }

      await this.prisma.comment.update({
        where: { id },
        data: { isDeleted: false },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to restore comment ${id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Không thể khôi phục bình luận');
    }
  }

  async getCommentStats(): Promise<CommentStats> {
    try {
      const [total, active, deleted, withReplies, avgLikes] = await Promise.all(
        [
          this.prisma.comment.count(),
          this.prisma.comment.count({ where: { isDeleted: false } }),
          this.prisma.comment.count({ where: { isDeleted: true } }),
          this.prisma.comment.count({
            where: {
              replies: {
                some: {},
              },
            },
          }),
          this.prisma.comment.aggregate({
            _avg: {
              likesCount: true,
            },
          }),
        ],
      );

      return {
        total,
        active,
        deleted,
        withReplies,
        averageLikes: avgLikes._avg.likesCount || 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get comment stats: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Không thể lấy thống kê bình luận',
      );
    }
  }
}
