/**
 * Files Module - Interfaces and Types
 */

// ============================================================================
// File Interfaces
// ============================================================================

/**
 * Uploaded file interface compatible with both Express.Multer and Fastify
 */
export interface UploadedFile {
  readonly originalname: string;
  readonly filename?: string;
  readonly mimetype: string;
  readonly buffer: Buffer;
  readonly size: number;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  readonly id: string;
  readonly originalName: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: string;
  readonly fileHash: string;
}

/**
 * Multiple files upload result
 */
export interface FilesUploadResult {
  readonly success: boolean;
  readonly data: FileUploadResult[];
  readonly message: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  readonly id: string;
  readonly originalName: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly storageUrl: string;
  readonly fileHash: string;
  readonly uploaderId: string;
  readonly documentId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Secure file URL result
 */
export interface SecureFileUrlResult {
  readonly url: string;
  readonly expiresAt: Date;
}
