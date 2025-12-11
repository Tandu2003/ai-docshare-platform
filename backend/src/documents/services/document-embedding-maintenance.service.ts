import { DocumentSearchService } from './document-search.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

interface EmbeddingCheckResult {
  checked: number;
  generated: number;
  failed: number;
}

@Injectable()
export class DocumentEmbeddingMaintenanceService implements OnModuleInit {
  private readonly logger = new Logger(
    DocumentEmbeddingMaintenanceService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentSearchService: DocumentSearchService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const autoInit =
      this.configService.get<string>('EMBEDDING_AUTO_INIT') !== 'false';

    if (!autoInit) {
      this.logger.log(
        'Embedding auto-init disabled (EMBEDDING_AUTO_INIT=false), skipping check',
      );
      return;
    }

    // Run in background to avoid blocking startup
    void this.ensureEmbeddingsForDocuments().catch(error => {
      this.logger.error(
        'Failed to ensure embeddings for documents on startup:',
        error,
      );
    });
  }

  /**
   * Ensure all documents have embeddings (including private/unapproved).
   * Optionally limit to a specific document when provided.
   */
  async ensureEmbeddingsForDocuments(
    documentId?: string,
  ): Promise<EmbeddingCheckResult> {
    const where: Prisma.DocumentWhereInput = {
      embedding: { is: null },
    };

    if (documentId) {
      where.id = documentId;
    }

    const missingEmbeddings = await this.prisma.document.findMany({
      where,
      select: { id: true, title: true },
    });

    if (missingEmbeddings.length === 0) {
      this.logger.log(
        documentId
          ? `Document ${documentId} already has embedding`
          : 'All documents already have embeddings',
      );
      return { checked: 0, generated: 0, failed: 0 };
    }

    this.logger.log(
      `Found ${missingEmbeddings.length} documents missing embeddings. Generating...`,
    );

    let generated = 0;
    let failed = 0;

    for (const doc of missingEmbeddings) {
      try {
        await this.documentSearchService.generateDocumentEmbedding(doc.id);
        generated++;
      } catch (error: any) {
        failed++;
        this.logger.warn(
          `Failed to generate embedding for document ${doc.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Embedding check completed: ${generated} generated, ${failed} failed (checked ${missingEmbeddings.length})`,
    );

    return {
      checked: missingEmbeddings.length,
      generated,
      failed,
    };
  }
}
