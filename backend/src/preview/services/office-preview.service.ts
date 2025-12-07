import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudflareR2Service } from '../../common/cloudflare-r2.service';
import {
  FileInfo,
  PreviewGenerationOptions,
  PreviewImage,
} from '../interfaces';
import { PdfPreviewService } from './pdf-preview.service';
import { PreviewUtilService } from './preview-util.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OfficePreviewService {
  private readonly logger = new Logger(OfficePreviewService.name);

  constructor(
    private readonly r2Service: CloudflareR2Service,
    private readonly utilService: PreviewUtilService,
    private readonly pdfPreviewService: PdfPreviewService,
  ) {}

  async generateOfficePreviews(
    documentId: string,
    file: FileInfo & { mimeType: string },
    options?: PreviewGenerationOptions,
  ): Promise<PreviewImage[]> {
    this.logger.log(
      `Generating Office previews for file: ${file.originalName} (${file.mimeType})`,
    );

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'office-preview-'),
    );

    try {
      const ext = this.utilService.getExtensionFromMimeType(file.mimeType);
      const inputPath = path.join(tmpDir, `input${ext}`);

      // Download file from R2
      try {
        const fileStream = await this.r2Service.getFileStream(file.storageUrl);
        await this.utilService.streamToFile(fileStream, inputPath);
      } catch (downloadError) {
        this.logger.error(
          `Failed to download file from R2: ${(downloadError as Error).message}`,
        );
        throw new Error(
          `Cannot download file: ${(downloadError as Error).message}`,
        );
      }

      const fileStats = await fs.promises.stat(inputPath);
      if (fileStats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Convert to PDF
      const pdfPath = await this.convertToPdf(inputPath, tmpDir);

      if (!pdfPath) {
        return await this.pdfPreviewService.createPlaceholderPreviews(
          documentId,
          file.originalName,
          {
            processingStart: options?.processingStart,
            sourceType:
              options?.sourceType ??
              this.utilService.getSourceType(file.mimeType),
          },
        );
      }

      const pdfStats = await fs.promises.stat(pdfPath);
      if (pdfStats.size === 0) {
        return await this.pdfPreviewService.createPlaceholderPreviews(
          documentId,
          file.originalName,
          {
            processingStart: options?.processingStart,
            sourceType:
              options?.sourceType ??
              this.utilService.getSourceType(file.mimeType),
          },
        );
      }

      // Generate previews from PDF
      return await this.pdfPreviewService.generatePdfPreviews(
        documentId,
        {
          id: file.id,
          storageUrl: pdfPath,
          originalName: 'converted.pdf',
        },
        true,
        {
          processingStart: options?.processingStart,
          sourceType:
            options?.sourceType ??
            this.utilService.getSourceType(file.mimeType),
        },
      );
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  }

  private async convertToPdf(
    inputPath: string,
    tmpDir: string,
  ): Promise<string | null> {
    let pdfPath: string | null = null;

    // Approach 1: Try unoconv with soffice daemon (skip if known to fail)
    const unoconvAvailable =
      await this.utilService.isCommandAvailable('unoconv');
    if (unoconvAvailable) {
      this.logger.debug('Attempting unoconv conversion...');
      pdfPath = await this.tryUnoconvConversion(inputPath, tmpDir);
      if (pdfPath) {
        return pdfPath;
      }
      this.logger.debug('unoconv failed, falling back to LibreOffice');
    } else {
      this.logger.debug('unoconv not available, using LibreOffice directly');
    }

    // Approach 2: Standard LibreOffice conversion (primary fallback)
    this.logger.debug('Attempting LibreOffice conversion...');
    pdfPath = await this.tryLibreOfficeConversion(inputPath, tmpDir);
    if (pdfPath) {
      return pdfPath;
    }

    // Approach 3: Alternative LibreOffice options
    this.logger.debug('Attempting alternative LibreOffice conversion...');
    pdfPath = await this.tryAlternativeLibreOffice(inputPath, tmpDir);
    if (pdfPath) {
      return pdfPath;
    }

    // Approach 4: Last resort unoconv without daemon (only if not tried yet)
    if (unoconvAvailable) {
      this.logger.debug('Attempting unoconv without daemon as last resort...');
      pdfPath = await this.tryUnoconvNoDaemon(inputPath, tmpDir);
    }

    if (!pdfPath) {
      this.logger.error(
        'All conversion methods failed. Cannot convert Office document to PDF.',
      );
    }

    return pdfPath;
  }

  private async tryUnoconvConversion(
    inputPath: string,
    tmpDir: string,
  ): Promise<string | null> {
    const unoconvOutput = path.join(tmpDir, 'output.pdf');

    try {
      await this.utilService.runCommandWithTimeout(
        `unoconv --port=8100 -f pdf -o "${unoconvOutput}" "${inputPath}"`,
        { logLabel: 'unoconv' },
      );

      if (await this.utilService.fileExists(unoconvOutput)) {
        this.logger.log(`unoconv created PDF at: ${unoconvOutput}`);
        return unoconvOutput;
      }
    } catch (unoError) {
      const errorMessage = (unoError as Error).message;
      const isDistutilsError = errorMessage.includes('distutils');

      if (isDistutilsError) {
        // Silently skip unoconv if distutils is missing - will use LibreOffice
        return null;
      }

      // Only log non-distutils errors at debug level
      this.logger.debug(`unoconv conversion failed: ${errorMessage}`);

      // Try starting soffice daemon only if not a distutils error
      const daemon = this.utilService.startSofficeDaemon(tmpDir);
      if (daemon) {
        await this.utilService.delay(1200);
        try {
          await this.utilService.runCommandWithTimeout(
            `unoconv --port=8100 -f pdf -o "${unoconvOutput}" "${inputPath}"`,
            { logLabel: 'unoconv-daemon' },
          );

          if (await this.utilService.fileExists(unoconvOutput)) {
            this.logger.log(
              `unoconv (daemon) created PDF at: ${unoconvOutput}`,
            );
            return unoconvOutput;
          }
        } catch (unoRetryError) {
          const retryErrorMessage = (unoRetryError as Error).message;
          if (!retryErrorMessage.includes('distutils')) {
            this.logger.debug(
              `unoconv with daemon failed: ${retryErrorMessage}`,
            );
          }
        } finally {
          try {
            daemon.kill('SIGKILL');
          } catch {
            // ignore
          }
        }
      }
    }

    return null;
  }

  private async tryLibreOfficeConversion(
    inputPath: string,
    tmpDir: string,
  ): Promise<string | null> {
    try {
      const { stdout, stderr } = await this.utilService.runCommandWithTimeout(
        `soffice --headless --nofirststartwizard --norestore --nologo --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`,
        {
          logLabel: 'soffice-convert',
          env: {
            ...process.env,
            HOME: tmpDir,
            TMPDIR: tmpDir,
          },
        },
      );

      this.logger.log(`LibreOffice stdout: ${stdout}`);
      if (stderr) this.logger.warn(`LibreOffice stderr: ${stderr}`);

      return await this.findPdfInDir(tmpDir);
    } catch (loError) {
      this.logger.warn(
        `LibreOffice conversion failed: ${(loError as Error).message}`,
      );
      return null;
    }
  }

  private async tryAlternativeLibreOffice(
    inputPath: string,
    tmpDir: string,
  ): Promise<string | null> {
    try {
      this.logger.log('Trying alternative LibreOffice conversion...');
      const { stdout, stderr } = await this.utilService.runCommandWithTimeout(
        `libreoffice --headless --invisible --convert-to pdf:writer_pdf_Export --outdir "${tmpDir}" "${inputPath}"`,
        {
          logLabel: 'libreoffice-alt',
          env: {
            ...process.env,
            HOME: tmpDir,
            TMPDIR: tmpDir,
            SAL_USE_VCLPLUGIN: 'svp',
          },
        },
      );

      this.logger.log(`LibreOffice (alt) stdout: ${stdout}`);
      if (stderr) this.logger.warn(`LibreOffice (alt) stderr: ${stderr}`);

      return await this.findPdfInDir(tmpDir);
    } catch (loError) {
      this.logger.warn(
        `Alternative LibreOffice conversion failed: ${(loError as Error).message}`,
      );
      return null;
    }
  }

  private async tryUnoconvNoDaemon(
    inputPath: string,
    tmpDir: string,
  ): Promise<string | null> {
    const unoconvOutput = path.join(tmpDir, 'output.pdf');

    try {
      this.logger.debug('Trying unoconv conversion (no daemon)...');
      await this.utilService.runCommandWithTimeout(
        `unoconv -f pdf -o "${unoconvOutput}" "${inputPath}"`,
        { logLabel: 'unoconv-last' },
      );

      if (await this.utilService.fileExists(unoconvOutput)) {
        this.logger.log(`unoconv created PDF at: ${unoconvOutput}`);
        return unoconvOutput;
      }
    } catch (unoError) {
      const errorMessage = (unoError as Error).message;
      // Only log non-distutils errors at debug level
      if (!errorMessage.includes('distutils')) {
        this.logger.debug(`unoconv conversion failed: ${errorMessage}`);
      }
    }

    return null;
  }

  private async findPdfInDir(tmpDir: string): Promise<string | null> {
    const expectedPdf = path.join(tmpDir, 'input.pdf');
    if (await this.utilService.fileExists(expectedPdf)) {
      this.logger.log(`PDF created at: ${expectedPdf}`);
      return expectedPdf;
    }

    const files = await fs.promises.readdir(tmpDir);
    const pdfFile = files.find(f => f.endsWith('.pdf'));
    if (pdfFile) {
      const pdfPath = path.join(tmpDir, pdfFile);
      this.logger.log(`Found PDF at: ${pdfPath}`);
      return pdfPath;
    }

    return null;
  }
}
