import { DocumentSearchService } from './document-search.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

interface EmbeddingCheckResult {
  checked: number;
  generated: number;
  failed: number;
}

@Injectable()
export class DocumentEmbeddingMaintenanceService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentSearchService: DocumentSearchService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const autoInit =
      this.configService.get<string>('EMBEDDING_AUTO_INIT') !== 'false';

    if (!autoInit) {
      return;
    }

    void this.ensureEmbeddingsForDocuments().catch(() => {
      // Silent error handling
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
      return { checked: 0, generated: 0, failed: 0 };
    }

    let generated = 0;
    let failed = 0;

    for (const doc of missingEmbeddings) {
      try {
        await this.documentSearchService.generateDocumentEmbedding(doc.id);
        generated++;
      } catch {
        failed++;
      }
    }

    return {
      checked: missingEmbeddings.length,
      generated,
      failed,
    };
  }
}
