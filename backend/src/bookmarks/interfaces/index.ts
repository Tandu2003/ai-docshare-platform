import {
  Bookmark,
  BookmarkFolder,
  Category,
  Document,
  User,
} from '@prisma/client';

export interface BookmarkWithDocument extends Bookmark {
  readonly folder: Pick<BookmarkFolder, 'id' | 'name'> | null;
  readonly document: BookmarkDocument;
}
export interface BookmarkDocument {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly tags: string[];
  readonly language: string | null;
  readonly isPublic: boolean;
  readonly isPremium: boolean;
  readonly isApproved: boolean;
  readonly createdAt: Date;
  readonly downloadCount: number;
  readonly viewCount: number;
  readonly averageRating: number | null;
  readonly totalRatings: number;
  readonly category: Pick<Category, 'id' | 'name' | 'icon'> | null;
  readonly uploader: Pick<
    User,
    'id' | 'username' | 'firstName' | 'lastName' | 'avatar'
  >;
}

export interface BookmarkFolderWithCount extends BookmarkFolder {
  readonly bookmarkCount: number;
}

export interface BookmarkStats {
  readonly total: number;
  readonly uncategorized: number;
  readonly folders: BookmarkFolderStat[];
}

export interface BookmarkFolderStat {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}

export interface GetBookmarksOptions {
  readonly folderId?: string;
  readonly search?: string;
  readonly documentId?: string;
}
