import type { AIAnalysis, DocumentModerationStatus } from '@/types';

import type { UploadedFile } from './upload.service';

export interface PaginatedDocuments {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentShareLink {
  token?: string;
  expiresAt: string;
  isRevoked?: boolean;
}

export interface DocumentPreview {
  id: string;
  documentId: string;
  pageNumber: number;
  previewUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  variants?: {
    small: string;
    medium: string;
    large: string;
  };
  metadata?: {
    pageCount: number;
    processingTimeMs: number;
    previewSizes: string[];
    sourceType: 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE' | 'TEXT';
    textPreviewPath?: string;
  };
}

export type PreviewStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentView {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  language: string;
  needsReModeration?: boolean;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  isDraft: boolean;
  moderationStatus: DocumentModerationStatus;
  moderationNotes?: string | null;
  rejectionReason?: string | null;
  moderatedAt?: string | null;
  moderatedById?: string | null;
  viewCount: number;
  downloadCount: number;
  downloadCost?: number;
  originalDownloadCost?: number | null;
  systemDefaultDownloadCost?: number;
  hasDownloaded?: boolean;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
  categoryId?: string;
  uploader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
  };
  files: {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: number | string;
    thumbnailUrl?: string;
    order: number;
    secureUrl?: string;
    expiresAt?: string;
  }[];
  previews?: DocumentPreview[];
  previewStatus?: PreviewStatus;
  previewCount?: number;
  stats: {
    ratingsCount: number;
    commentsCount: number;
    viewsCount: number;
    downloadsCount: number;
  };
  shareLink?: DocumentShareLink;
  aiAnalysis?: AIAnalysis | null;
  zipFileUrl?: string;
  zipFileCreatedAt?: string;
}

export interface ViewDocumentRequest {
  referrer?: string;
}

export interface ShareDocumentRequest {
  expiresInMinutes?: number;
  expiresAt?: string;
  regenerateToken?: boolean;
}

export interface ShareDocumentResponse {
  token?: string;
  expiresAt: string;
  isRevoked: boolean;
  shareUrl?: string;
}

export interface SimilarityResult {
  id: string;
  targetDocument: {
    id: string;
    title: string;
    description?: string;
    uploader: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
    category: {
      id: string;
      name: string;
    };
    createdAt: string;
  };
  similarityScore: number;
  similarityType: string;
  createdAt: string;
}

