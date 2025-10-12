import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

interface GetBookmarksOptions {
  folderId?: string;
  search?: string;
  documentId?: string;
}

interface BookmarkStats {
  total: number;
  uncategorized: number;
  folders: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

@Injectable()
export class BookmarksService {
  private readonly bookmarkInclude = {
    folder: {
      select: {
        id: true,
        name: true,
      },
    },
    document: {
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        language: true,
        isPublic: true,
        isPremium: true,
        isApproved: true,
        createdAt: true,
        downloadCount: true,
        viewCount: true,
        averageRating: true,
        totalRatings: true,
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  async getUserBookmarks(userId: string, options: GetBookmarksOptions = {}) {
    const { folderId, documentId } = options;
    const searchTerm = options.search?.trim();

    return this.prisma.bookmark.findMany({
      where: {
        userId,
        folderId: folderId || undefined,
        documentId: documentId || undefined,
        ...(searchTerm
          ? {
              document: {
                OR: [
                  { title: { contains: searchTerm, mode: 'insensitive' } },
                  { description: { contains: searchTerm, mode: 'insensitive' } },
                  { tags: { has: searchTerm } },
                ],
              },
            }
          : {}),
      },
      include: this.bookmarkInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createBookmark(userId: string, payload: CreateBookmarkDto) {
    const { documentId, folderId, notes } = payload;

    const document = await this.prisma.document.findUnique({
      where: {
        id: documentId,
      },
      select: {
        id: true,
        uploaderId: true,
        isPublic: true,
        isApproved: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or not accessible');
    }

    const isOwner = document.uploaderId === userId;
    const canAccess = isOwner || document.isPublic === true;

    if (!canAccess) {
      throw new NotFoundException('Document not found or not accessible');
    }

    if (folderId) {
      const folder = await this.prisma.bookmarkFolder.findFirst({
        where: {
          id: folderId,
          userId,
        },
      });

      if (!folder) {
        throw new BadRequestException('Bookmark folder not found');
      }
    }

    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId,
        },
      },
    });

    if (existingBookmark) {
      throw new BadRequestException('Document already bookmarked');
    }

    const created = await this.prisma.bookmark.create({
      data: {
        userId,
        documentId,
        folderId: folderId || undefined,
        notes,
      },
    });

    return this.prisma.bookmark.findUnique({
      where: { id: created.id },
      include: this.bookmarkInclude,
    });
  }

  async removeBookmark(userId: string, bookmarkId: string) {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userId,
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    return { success: true };
  }

  async getBookmarkStats(userId: string): Promise<BookmarkStats> {
    const [total, uncategorized, folders] = await Promise.all([
      this.prisma.bookmark.count({ where: { userId } }),
      this.prisma.bookmark.count({ where: { userId, folderId: null } }),
      this.prisma.bookmarkFolder.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              bookmarks: true,
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
    ]);

    return {
      total,
      uncategorized,
      folders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        count: folder._count.bookmarks,
      })),
    };
  }
}
