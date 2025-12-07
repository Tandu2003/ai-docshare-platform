import { PreviewStatus } from '@prisma/client';

export type PreviewSize = 'small' | 'medium' | 'large';
export type SourceType = 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE' | 'TEXT';
export interface PreviewMetadata {
  pageCount: number;
  processingTimeMs: number;
  previewSizes: PreviewSize[];
  sourceType: SourceType;
  textPreviewPath?: string;
}

export interface PreviewImage {
  id: string;
  documentId: string;
  pageNumber: number;
  previewUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  variants?: PreviewVariants;
  metadata?: PreviewMetadata;
}

export interface PreviewVariants {
  small: string;
  medium: string;
  large: string;
}

export interface PreviewGenerationResult {
  success: boolean;
  documentId: string;
  previews: PreviewImage[];
  totalPages: number;
  error?: string;
}

export interface PreviewGenerationOptions {
  processingStart?: number;
  sourceType?: SourceType;
}

export interface FileInfo {
  id: string;
  storageUrl: string;
  originalName: string;
  mimeType?: string;
}

export interface PreviewStatusResult {
  status: PreviewStatus;
  error?: string;
  previewCount: number;
  metadata?: PreviewMetadata;
}

export interface PreviewImageResult {
  url: string;
  expiresAt: Date;
  mimeType: string;
}

export interface PreviewStreamResult {
  stream: NodeJS.ReadableStream;
  mimeType: string;
  contentLength?: number;
}

export interface CommandOptions {
  timeoutMs?: number;
  retries?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
  logLabel?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

// Constants

export const PREVIEW_SIZES: Record<PreviewSize, number> = {
  small: 200,
  medium: 800,
  large: 1200,
};

export const MAX_PREVIEW_PAGES = 3;
export const PREVIEW_QUALITY = 85;
export const SHORT_SIGNED_URL_EXPIRY = 30; // 30 seconds

export const OFFICE_FORMATS = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export const TEXT_FORMATS = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/xml',
  'application/json',
  'application/xml',
];

export const MIME_TO_EXT: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/pdf': '.pdf',
};
