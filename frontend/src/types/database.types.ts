// Database types based on Prisma schema
import type { Actions, Subjects } from '@/lib/casl/ability.factory';

export type DocumentModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Permission {
  action: Actions;
  subject: Subjects;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  roleId: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  resetToken?: string;
  resetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  moderatedDocuments?: Document[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  isActive: boolean;
  documentCount: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  parent?: Category;
  children?: Category[];
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  uploaderId: string;
  categoryId: string;
  downloadCount: number;
  viewCount: number;
  averageRating: number;
  totalRatings: number;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  isDraft: boolean;
  moderationStatus: DocumentModerationStatus;
  moderatedById?: string | null;
  moderatedAt?: Date | null;
  moderationNotes?: string | null;
  rejectionReason?: string | null;
  aiModeration?: Record<string, any> | null;
  tags: string[];
  language: string;
  zipFileUrl?: string;
  zipFileCreatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  uploader: User;
  category: Category;
  files?: DocumentFile[];
  ratings?: Rating[];
  comments?: Comment[];
  aiAnalysis?: AIAnalysis;
}

export interface DocumentFile {
  id: string;
  documentId: string;
  fileId: string;
  order: number;
  createdAt: Date;
  document: Document;
  file: File;
}

export interface File {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  storageUrl: string;
  thumbnailUrl?: string;
  uploaderId: string;
  isPublic: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  uploader: User;
}

export interface Rating {
  id: string;
  userId: string;
  documentId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  document: Document;
}

export interface Comment {
  id: string;
  userId: string;
  documentId: string;
  parentId?: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  likesCount: number;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  document: Document;
  parent?: Comment;
  replies?: Comment[];
  likes?: CommentLike[];
}

export interface CommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: Date;
  user: User;
  comment: Comment;
}

export interface AIAnalysis {
  id: string;
  documentId: string;
  summary?: string;
  keyPoints: string[];
  suggestedTags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTime: number;
  language: string;
  confidence: number;
  reliabilityScore?: number;
  sentimentScore?: number;
  topicModeling?: Record<string, any>;
  namedEntities?: Record<string, any>;
  // Enhanced moderation fields
  moderationScore?: number; // 0-100 safety score
  safetyFlags?: string[]; // List of detected safety issues
  isSafe?: boolean; // Overall safety assessment
  recommendedAction?: 'approve' | 'review' | 'reject'; // AI recommendation
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  document: Document;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: Record<string, any>;
  resultsCount: number;
  clickedDocumentId?: string;
  searchVector?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  searchedAt: Date;
  user: User;
  clickedDocument?: Document;
}

export interface RecommendationEngine {
  id: string;
  userId: string;
  documentId: string;
  score: number;
  reason: string;
  algorithm: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  document: Document;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'rating' | 'system' | 'document_approved' | 'collaboration';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  user: User;
}

export interface BookmarkFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  bookmarks?: Bookmark[];
}

export interface Bookmark {
  id: string;
  userId: string;
  documentId: string;
  folderId?: string;
  notes?: string;
  createdAt: Date;
  user: User;
  document: Document;
  folder?: BookmarkFolder;
}

export interface Download {
  id: string;
  userId?: string;
  documentId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  downloadedAt: Date;
  user?: User;
  document: Document;
}

export interface View {
  id: string;
  userId?: string;
  documentId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  viewedAt: Date;
  user?: User;
  document: Document;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AISettings {
  autoApprovalThreshold: number;
  autoRejectThreshold: number;
  enableAutoApproval: boolean;
  enableAutoRejection: boolean;
  enableContentAnalysis: boolean;
  enableSmartTags: boolean;
  confidenceThreshold: number;
}

export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  maxFileSize: number;
  allowedFileTypes: string;
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  enablePublicUploads: boolean;
  moderationRequired: boolean;
}

export interface NotificationSettings {
  enableEmail: boolean;
  enablePush: boolean;
  emailOnApproval: boolean;
  emailOnRejection: boolean;
}

export interface SecuritySettings {
  enableRateLimiting: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireStrongPasswords: boolean;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  user?: User;
}

// Extended types for UI components
export interface DocumentWithDetails extends Document {
  files: (DocumentFile & { file: File })[];
  ratings: Rating[];
  comments: Comment[];
  aiAnalysis?: AIAnalysis;
}

export interface UserWithStats extends User {
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
  averageRating: number;
}

export interface CategoryWithStats extends Category {
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
}

// Form types
export interface CreateDocumentForm {
  title: string;
  description?: string;
  categoryId: string;
  tags: string[];
  language: string;
  isPublic: boolean;
  isPremium: boolean;
  files: File[];
}

export interface UpdateDocumentForm {
  title?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
  language?: string;
  isPublic?: boolean;
  isPremium?: boolean;
}

export interface CreateCommentForm {
  content: string;
  parentId?: string;
}

export interface CreateBookmarkForm {
  documentId: string;
  folderId?: string;
  notes?: string;
}

// Filter and search types
export interface DocumentFilters {
  categoryId?: string;
  tags?: string[];
  language?: string;
  isPublic?: boolean;
  isPremium?: boolean;
  isApproved?: boolean;
  difficulty?: string;
  minRating?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface SearchFilters extends DocumentFilters {
  query?: string;
  sortBy?: 'relevance' | 'date' | 'rating' | 'downloads' | 'views';
  sortOrder?: 'asc' | 'desc';
}

// Dashboard statistics
export interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  totalDownloads: number;
  totalViews: number;
  recentDocuments: Document[];
  popularCategories: CategoryWithStats[];
  userActivity: ActivityLog[];
  recentNotifications: Notification[];
}

// Auth types
export interface LoginDto {
  email?: string;
  emailOrUsername?: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
}

export interface AuthState {
  user: User | null;
  token?: string | null;
  accessToken?: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string | null;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ResendVerificationDto {
  email: string;
}

export interface VerifyEmailDto {
  token: string;
}
