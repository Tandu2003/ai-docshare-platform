export { BookmarksService } from './bookmarks.service';
// Controllers
export { BookmarksController } from './controllers/bookmarks.controller';
// Module
export { BookmarksModule } from './bookmarks.module';
// DTOs
export { CreateBookmarkDto } from './dto';
export type {
  BookmarkWithDocument,
  BookmarkDocument,
  BookmarkFolderWithCount,
  BookmarkStats,
  BookmarkFolderStat,
  GetBookmarksOptions,
} from './interfaces';

// Constants
export {
  MAX_BOOKMARKS_PER_USER,
  MAX_FOLDERS_PER_USER,
  MAX_FOLDER_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  BOOKMARK_ERROR_MESSAGES,
  BOOKMARK_SUCCESS_MESSAGES,
} from './constants';
