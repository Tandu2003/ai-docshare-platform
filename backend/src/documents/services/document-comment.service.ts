import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

interface AddCommentDto {
  readonly content: string;
  readonly parentId?: string;
}
/** DTO for editing a comment */
interface EditCommentDto {
  readonly content: string;
}

/** Comment with user info */
interface CommentWithUser {
  readonly id: string;
  readonly content: string;
  readonly isEdited: boolean;
  readonly editedAt: Date | null;
  readonly likesCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isLiked: boolean;
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly firstName: string | null;
    readonly lastName: string | null;
    readonly avatar: string | null;
  };
  readonly replies?: CommentWithUser[];
}

/** Rating response */
interface RatingResponse {
  readonly rating: number;
}

@Injectable()
export class DocumentCommentService {
  private readonly logger = new Logger(DocumentCommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getComments(
    documentId: string,
    userId?: string,
  ): Promise<CommentWithUser[]> {
    try {
      const comments = await this.prisma.comment.findMany({
        where: { documentId, isDeleted: false },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          likes: userId
            ? {
                where: { userId },
                select: { userId: true },
              }
            : false,
          replies: {
            where: { isDeleted: false },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
              likes: userId
                ? {
                    where: { userId },
                    select: { userId: true },
                  }
                : false,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const transformComment = (comment: any): CommentWithUser => ({
        ...comment,
        isLiked: userId ? comment.likes?.length > 0 : false,
        likes: undefined,
        replies: comment.replies?.map(transformComment),
      });

      return comments.map(transformComment);
    } catch (error) {
      this.logger.error(
        `Error getting comments for document ${documentId}:`,
        error,
      );
      throw new InternalServerErrorException('Không thể lấy bình luận');
    }
  }

  async addComment(
    documentId: string,
    userId: string,
    dto: AddCommentDto,
  ): Promise<CommentWithUser> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, title: true, uploaderId: true },
      });

      if (!document) {
        throw new BadRequestException('Không tìm thấy tài liệu');
      }

      let parentComment: { id: string; userId: string } | null = null;
      if (dto.parentId) {
        parentComment = await this.prisma.comment.findUnique({
          where: { id: dto.parentId },
          select: { id: true, userId: true },
        });
      }

      const comment = await this.prisma.comment.create({
        data: {
          documentId,
          userId,
          parentId: dto.parentId || null,
          content: dto.content,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      const commenterName = this.formatUserName(comment.user);
      const truncatedContent = this.truncateContent(comment.content, 100);

      // Notify parent comment owner if this is a reply
      if (dto.parentId && parentComment && parentComment.userId !== userId) {
        await this.notifications.emitToUser(parentComment.userId, {
          type: 'reply',
          documentId,
          documentTitle: document.title,
          commentId: comment.id,
          parentCommentId: dto.parentId,
          replierName: commenterName,
          replierId: userId,
          content: truncatedContent,
        });

        this.logger.log(
          `Reply notification sent to comment owner ${parentComment.userId}`,
        );
      }

      // Notify document owner
      const shouldNotifyDocOwner =
        document.uploaderId &&
        document.uploaderId !== userId &&
        (!parentComment || parentComment.userId !== document.uploaderId);

      if (shouldNotifyDocOwner) {
        await this.notifications.emitToUser(document.uploaderId, {
          type: 'comment',
          documentId,
          documentTitle: document.title,
          commentId: comment.id,
          commenterName,
          commenterId: userId,
          content: truncatedContent,
          isReply: !!dto.parentId,
        });

        this.logger.log(
          `Comment notification sent to document owner ${document.uploaderId}`,
        );
      }

      // Broadcast to all document viewers
      const commentWithIsLiked = { ...comment, isLiked: false };
      this.notifications.emitToDocument(documentId, {
        type: 'new_comment',
        documentId,
        comment: commentWithIsLiked,
      });

      return commentWithIsLiked as unknown as CommentWithUser;
    } catch (error) {
      this.logger.error(
        `Error adding comment for document ${documentId}:`,
        error,
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể thêm bình luận');
    }
  }

  async likeComment(
    documentId: string,
    commentId: string,
    userId: string,
  ): Promise<{ likesCount: number; isLiked: boolean }> {
    try {
      const comment = await this.prisma.comment.findFirst({
        where: { id: commentId, documentId },
        include: {
          user: { select: { id: true } },
          document: { select: { id: true, title: true } },
        },
      });

      if (!comment) {
        throw new BadRequestException('Không tìm thấy bình luận');
      }

      const existingLike = await this.prisma.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });

      if (existingLike) {
        return this.unlikeComment(documentId, commentId, userId);
      }

      return this.createLike(documentId, commentId, userId, comment);
    } catch (error) {
      this.logger.error(`Error liking comment ${commentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể thích bình luận');
    }
  }

  async editComment(
    documentId: string,
    commentId: string,
    userId: string,
    dto: EditCommentDto,
  ): Promise<{ id: string; content: string; isEdited: boolean }> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment || comment.documentId !== documentId) {
        throw new BadRequestException('Không tìm thấy bình luận');
      }

      if (comment.userId !== userId) {
        throw new BadRequestException('Bạn không có quyền sửa bình luận này');
      }

      const updated = await this.prisma.comment.update({
        where: { id: commentId },
        data: { content: dto.content, isEdited: true, editedAt: new Date() },
      });

      return {
        id: updated.id,
        content: updated.content,
        isEdited: updated.isEdited,
      };
    } catch (error) {
      this.logger.error(`Error editing comment ${commentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể sửa bình luận');
    }
  }

  async deleteComment(
    documentId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment || comment.documentId !== documentId) {
        throw new BadRequestException('Không tìm thấy bình luận');
      }

      if (comment.userId !== userId) {
        throw new BadRequestException('Bạn không có quyền xóa bình luận này');
      }

      await this.prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
    } catch (error) {
      this.logger.error(`Error deleting comment ${commentId}:`, error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể xóa bình luận');
    }
  }

  async getUserRating(
    documentId: string,
    userId: string,
  ): Promise<RatingResponse> {
    try {
      const rating = await this.prisma.rating.findUnique({
        where: { userId_documentId: { userId, documentId } },
        select: { rating: true },
      });

      return { rating: rating?.rating || 0 };
    } catch (error) {
      this.logger.error(
        `Error getting user rating for document ${documentId}:`,
        error,
      );
      throw new InternalServerErrorException('Không thể lấy đánh giá');
    }
  }

  async setUserRating(
    documentId: string,
    userId: string,
    ratingValue: number,
  ): Promise<RatingResponse> {
    try {
      const existing = await this.prisma.rating.findUnique({
        where: { userId_documentId: { userId, documentId } },
      });

      if (existing) {
        await this.prisma.rating.update({
          where: { userId_documentId: { userId, documentId } },
          data: { rating: ratingValue },
        });
      } else {
        await this.prisma.rating.create({
          data: { userId, documentId, rating: ratingValue },
        });
      }

      // Recompute aggregates
      const agg = await this.prisma.rating.aggregate({
        where: { documentId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          averageRating: agg._avg.rating || 0,
          totalRatings: agg._count.rating || 0,
        },
      });

      return { rating: ratingValue };
    } catch (error) {
      this.logger.error(
        `Error setting rating for document ${documentId}:`,
        error,
      );
      throw new InternalServerErrorException('Không thể cập nhật đánh giá');
    }
  }

  // ============ Private Helper Methods ============

  private formatUserName(user: {
    firstName: string | null;
    lastName: string | null;
    username: string;
  }): string {
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username;
  }

  private truncateContent(content: string, maxLength: number): string {
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  private async unlikeComment(
    documentId: string,
    commentId: string,
    userId: string,
  ): Promise<{ likesCount: number; isLiked: boolean }> {
    await this.prisma.commentLike.delete({
      where: { userId_commentId: { userId, commentId } },
    });

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { likesCount: { decrement: 1 } },
    });

    this.notifications.emitToDocument(documentId, {
      type: 'comment_updated',
      documentId,
      commentId,
      likesCount: updated.likesCount,
      isLiked: false,
      likerId: userId,
    });

    return { likesCount: updated.likesCount, isLiked: false };
  }

  private async createLike(
    documentId: string,
    commentId: string,
    userId: string,
    comment: any,
  ): Promise<{ likesCount: number; isLiked: boolean }> {
    await this.prisma.commentLike.create({
      data: { userId, commentId },
    });

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { likesCount: { increment: 1 } },
    });

    this.notifications.emitToDocument(documentId, {
      type: 'comment_updated',
      documentId,
      commentId,
      likesCount: updated.likesCount,
      isLiked: true,
      likerId: userId,
    });

    // Notify comment owner
    if (comment.userId !== userId) {
      const liker = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, firstName: true, lastName: true },
      });

      const likerName = this.formatUserName(
        liker || { firstName: null, lastName: null, username: 'Người dùng' },
      );

      await this.notifications.emitToUser(comment.userId, {
        type: 'comment_like',
        documentId,
        documentTitle: comment.document.title,
        commentId,
        likerName,
        likerId: userId,
      });

      this.logger.log(
        `Like notification sent to comment owner ${comment.userId}`,
      );
    }

    return { likesCount: updated.likesCount, isLiked: true };
  }
}
