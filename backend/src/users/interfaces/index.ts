/**
 * Users Module - Interfaces and Types
 */

import { Role, User } from '@prisma/client';

// ============================================================================
// User Interfaces
// ============================================================================

/**
 * User with role information
 */
export interface UserWithRole extends Omit<User, 'password'> {
  readonly role: Pick<Role, 'id' | 'name' | 'description'>;
}

/**
 * User statistics
 */
export interface UserStatistics {
  readonly documentsCount: number;
  readonly ratingsCount: number;
  readonly commentsCount: number;
  readonly bookmarksCount: number;
  readonly downloadsCount: number;
  readonly viewsCount: number;
  readonly totalPoints: number;
}

/**
 * User activity item
 */
export interface UserActivity {
  readonly id: string;
  readonly type: UserActivityType;
  readonly description: string;
  readonly targetId?: string;
  readonly targetType?: string;
  readonly createdAt: Date;
}

/**
 * Pagination metadata for users
 */
export interface UserPaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

/**
 * Users list response
 */
export interface UsersListResponse {
  readonly users: UserWithRole[];
  readonly pagination: UserPaginationMeta;
}

// ============================================================================
// Types
// ============================================================================

export type UserActivityType =
  | 'document_upload'
  | 'document_download'
  | 'comment_added'
  | 'rating_given'
  | 'bookmark_added'
  | 'profile_updated';
