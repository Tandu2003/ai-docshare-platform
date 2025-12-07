export interface UploadedFile {
  readonly originalname: string;
  readonly filename?: string;
  readonly mimetype: string;
  readonly buffer: Buffer;
  readonly size: number;
}
export interface FileUploadResult {
  readonly id: string;
  readonly originalName: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: string;
  readonly fileHash: string;
}

export interface FilesUploadResult {
  readonly success: boolean;
  readonly data: FileUploadResult[];
  readonly message: string;
}

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

export interface SecureFileUrlResult {
  readonly url: string;
  readonly expiresAt: Date;
}
