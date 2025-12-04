/**
 * Preview Utility Service
 *
 * Handles common utility functions for preview generation:
 * - File operations (stream to file, file existence check)
 * - Command execution with timeout and retries
 * - Image dimension extraction
 * - Metadata building and parsing
 * - Format detection helpers
 */

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
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PreviewUtilService {
  private readonly logger = new Logger(PreviewUtilService.name);

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Write stream to file
   */
  async streamToFile(stream: Readable, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Delay helper
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Command Execution
  // ============================================================================

  /**
   * Run shell command with timeout, retries, and hard kill on hang
   */
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
      const label = options?.logLabel || 'Command';
      const startedAt = Date.now();

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

        this.logger.debug(
          `${label} succeeded in ${Date.now() - startedAt}ms (attempt ${attempt}/${retries + 1})`,
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `${label} failed (attempt ${attempt}/${retries + 1}): ${lastError.message}`,
        );
      }
    }

    throw lastError || new Error('Unknown command error');
  }

  /**
   * Check if a command is available
   */
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

  /**
   * Start LibreOffice daemon for unoconv
   */
  async startSofficeDaemon(tmpDir: string): Promise<ChildProcess | null> {
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
    } catch (error) {
      this.logger.warn(
        `Failed to start soffice daemon: ${(error as Error).message}`,
      );
      return null;
    }
  }

  // ============================================================================
  // Image Operations
  // ============================================================================

  /**
   * Resize image using ImageMagick
   */
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
    } catch (error) {
      this.logger.warn(
        `Resize failed (${width}px): ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Get image dimensions from buffer (basic JPEG implementation)
   */
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

  /**
   * Build preview metadata
   */
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

  /**
   * Parse metadata from string
   */
  parseMetadata(metadataString?: string | null): PreviewMetadata | undefined {
    if (!metadataString) return undefined;
    try {
      return JSON.parse(metadataString) as PreviewMetadata;
    } catch {
      return undefined;
    }
  }

  /**
   * Get variant key for preview path
   */
  getVariantKey(previewPath: string, size: PreviewSize): string {
    if (size === 'medium') return previewPath;
    const ext = path.extname(previewPath) || '.jpg';
    const base = previewPath.slice(0, -ext.length);
    return `${base}-${size}${ext}`;
  }

  // ============================================================================
  // Format Detection
  // ============================================================================

  /**
   * Check if mime type is previewable
   */
  isPreviewableFormat(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      this.isOfficeFormat(mimeType) ||
      mimeType.startsWith('image/') ||
      this.isTextFormat(mimeType)
    );
  }

  /**
   * Check if mime type is Office format
   */
  isOfficeFormat(mimeType: string): boolean {
    return OFFICE_FORMATS.includes(mimeType);
  }

  /**
   * Check if mime type is text format
   */
  isTextFormat(mimeType: string): boolean {
    return TEXT_FORMATS.includes(mimeType) || mimeType.startsWith('text/');
  }

  /**
   * Get source type from mime type
   */
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

  /**
   * Get file extension from mime type
   */
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
