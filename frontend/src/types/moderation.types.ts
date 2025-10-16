import type { AIAnalysis, DocumentModerationStatus } from './database.types';

export interface ModerationSummary {
  pendingDocuments: number;
  rejectedDocuments: number;
  approvedToday: number;
}

export interface ModerationUploader {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  email?: string | null;
  isVerified?: boolean;
}

export interface ModerationCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface ModerationDocumentFile {
  id: string;
  originalName: string;
  fileName?: string;
  mimeType: string;
  fileSize: number | string;
  order: number;
  thumbnailUrl?: string | null;
  secureUrl?: string;
  expiresAt?: string;
}

export interface ModerationDocument {
  id: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  isApproved: boolean;
  moderationStatus: DocumentModerationStatus;
  moderationNotes?: string | null;
  rejectionReason?: string | null;
  moderatedAt?: string | null;
  moderatedById?: string | null;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category: ModerationCategory;
  uploader: ModerationUploader;
  aiAnalysis?: AIAnalysis | null;
  files: ModerationDocumentFile[];
}

export interface ModerationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ModerationQueueResponse {
  summary: ModerationSummary;
  documents: ModerationDocument[];
  pagination: ModerationPagination;
}

export interface ModerationQueueParams {
  page?: number;
  limit?: number;
  status?: DocumentModerationStatus;
  categoryId?: string;
  uploaderId?: string;
  sort?: 'createdAt' | 'title' | 'uploader';
  order?: 'asc' | 'desc';
}

export interface ModerationAnalysisResponse {
  success: boolean;
  analysis?: AIAnalysis | null;
  processedFiles: number;
  processingTime: number;
}
