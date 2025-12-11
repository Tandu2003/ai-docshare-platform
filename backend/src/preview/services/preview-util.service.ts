import { ChildProcess, exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import {
  CommandOptions,
  CommandResult,
  MIME_TO_EXT,
  OFFICE_FORMATS,
  PREVIEW_QUALITY,
  PREVIEW_SIZES,
  PreviewMetadata,
  PreviewSize,
  SourceType,
  TEXT_FORMATS,
} from '../interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PreviewUtilService {
  // ============================================================================
  // File Operations
  // ============================================================================

  async streamToFile(stream: Readable, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    return fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Command Execution
  // ============================================================================

  async runCommandWithTimeout(
    command: string,
    options?: CommandOptions,
  ): Promise<CommandResult> {
    const timeoutMs = options?.timeoutMs ?? 20000;
    const retries = options?.retries ?? 2;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      attempt++;

      try {
        const result = await new Promise<CommandResult>((resolve, reject) => {
          let done = false;
          const child = exec(
            command,
            {
              cwd: options?.cwd,
              env: options?.env,
              maxBuffer: options?.maxBuffer ?? 50 * 1024 * 1024,
            },
            (error, stdout, stderr) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              if (error) {
                reject(
                  new Error(
                    `${error.message}${
                      stderr ? `: ${stderr.trim()}` : ''
                    }`.trim(),
                  ),
                );
                return;
              }
              resolve({ stdout, stderr });
            },
          );

          const timer = setTimeout(() => {
            if (done) return;
            done = true;
            child.kill('SIGKILL');
            reject(new Error(`Command timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          child.on('error', err => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            reject(err);
          });
        });

        return result;
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError || new Error('Unknown command error');
  }

  async isCommandAvailable(command: string): Promise<boolean> {
    try {
      await this.runCommandWithTimeout(`command -v ${command}`, {
        logLabel: `check-${command}`,
        retries: 0,
      });
      return true;
    } catch {
      return false;
    }
  }

  startSofficeDaemon(tmpDir: string): ChildProcess | null {
    try {
      const child = spawn(
        'soffice',
        [
          '--headless',
          '--nologo',
          '--nofirststartwizard',
          '--norestore',
          '--nodefault',
          '--accept=socket,host=127.0.0.1,port=8100;urp;',
          `-env:UserInstallation=file://${tmpDir}/lo-profile`,
        ],
        {
          stdio: 'ignore',
        },
      );
      return child;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Image Operations
  // ============================================================================

  async resizeImage(
    inputPath: string,
    outputPath: string,
    width: number,
  ): Promise<boolean> {
    try {
      await this.runCommandWithTimeout(
        `convert "${inputPath}" -resize ${width}x -quality ${PREVIEW_QUALITY} "${outputPath}"`,
        { logLabel: `resize-${width}` },
      );
      return await this.fileExists(outputPath);
    } catch {
      return false;
    }
  }

  getImageDimensions(buffer: Buffer): { width?: number; height?: number } {
    try {
      // Check for JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let i = 2;
        while (i < buffer.length) {
          if (buffer[i] !== 0xff) break;
          const marker = buffer[i + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            // SOF0 or SOF2
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          const length = buffer.readUInt16BE(i + 2);
          i += 2 + length;
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return {};
  }

  // ============================================================================
  // Metadata Operations
  // ============================================================================

  buildMetadata(params: {
    pageCount: number;
    processingStart?: number;
    sourceType: SourceType;
    previewSizes?: PreviewSize[];
    textPreviewPath?: string;
  }): PreviewMetadata {
    return {
      pageCount: params.pageCount,
      processingTimeMs: params.processingStart
        ? Date.now() - params.processingStart
        : 0,
      previewSizes: params.previewSizes || ['small', 'medium', 'large'],
      sourceType: params.sourceType,
      textPreviewPath: params.textPreviewPath,
    };
  }

  parseMetadata(metadataString?: string | null): PreviewMetadata | undefined {
    if (!metadataString) return undefined;
    try {
      return JSON.parse(metadataString) as PreviewMetadata;
    } catch {
      return undefined;
    }
  }

  getVariantKey(previewPath: string, size: PreviewSize): string {
    if (size === 'medium') return previewPath;
    const ext = path.extname(previewPath) || '.jpg';
    const base = previewPath.slice(0, -ext.length);
    return `${base}-${size}${ext}`;
  }

  // ============================================================================
  // Format Detection
  // ============================================================================

  isPreviewableFormat(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      this.isOfficeFormat(mimeType) ||
      mimeType.startsWith('image/') ||
      this.isTextFormat(mimeType)
    );
  }

  isOfficeFormat(mimeType: string): boolean {
    return OFFICE_FORMATS.includes(mimeType);
  }

  isTextFormat(mimeType: string): boolean {
    return TEXT_FORMATS.includes(mimeType) || mimeType.startsWith('text/');
  }

  getSourceType(mimeType: string): SourceType {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (this.isTextFormat(mimeType)) return 'TEXT';
    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint'
    ) {
      return 'PPTX';
    }
    return 'DOCX';
  }

  getExtensionFromMimeType(mimeType: string): string {
    return MIME_TO_EXT[mimeType] || '.bin';
  }

  // ============================================================================
  // Preview Size Helpers
  // ============================================================================

  get previewSizes(): Record<PreviewSize, number> {
    return PREVIEW_SIZES;
  }

  get previewQuality(): number {
    return PREVIEW_QUALITY;
  }
}
