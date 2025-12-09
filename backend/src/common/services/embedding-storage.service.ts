import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Service for saving/reading document embeddings with proper PostgreSQL vector formatting.
 * Handles the conversion between number[] and PostgreSQL vector type.
 */
@Injectable()
export class EmbeddingStorageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get embedding for a document using raw SQL (Prisma can't handle vector type).
   * @returns Embedding data or null if not found
   */
  async getEmbedding(documentId: string): Promise<{
    id: string;
    embedding: number[];
    model: string;
    version: string;
    updatedAt: Date;
  } | null> {
    const result = await this.prisma.$queryRaw<
      Array<{
        id: string;
        embedding: string;
        model: string;
        version: string;
        updated_at: Date;
      }>
    >`
			SELECT id, embedding::text, model, version, "updatedAt" as updated_at
			FROM document_embeddings
			WHERE "documentId" = ${documentId}
		`;

    if (!result.length || !result[0].embedding) return null;

    try {
      const embedding = JSON.parse(result[0].embedding) as number[];
      return {
        id: result[0].id,
        embedding,
        model: result[0].model,
        version: result[0].version,
        updatedAt: result[0].updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get embeddings for multiple documents.
   */
  async getEmbeddings(documentIds: string[]): Promise<Map<string, number[]>> {
    if (!documentIds.length) return new Map();

    const result = await this.prisma.$queryRaw<
      Array<{ document_id: string; embedding: string }>
    >`
			SELECT "documentId" as document_id, embedding::text
			FROM document_embeddings
			WHERE "documentId" = ANY(${documentIds})
		`;

    const map = new Map<string, number[]>();
    for (const row of result) {
      try {
        map.set(row.document_id, JSON.parse(row.embedding));
      } catch {
        // Skip invalid embeddings
      }
    }
    return map;
  }

  /**
   * Save embedding using raw SQL to properly handle vector type.
   * This ensures correct formatting for PostgreSQL vector columns.
   * PostgreSQL vector type expects format: [1,2,3] as string literal.
   *
   * @param documentId - Document ID
   * @param embedding - Embedding vector as number array
   * @param model - Embedding model name (optional, defaults to 'text-embedding-ada-002')
   * @param version - Model version (optional, defaults to '1.0')
   */
  async saveEmbedding(
    documentId: string,
    embedding: number[],
    model: string = 'text-embedding-ada-002',
    version: string = '1.0',
  ): Promise<void> {
    // Format embedding as PostgreSQL vector literal: [1,2,3]
    const embeddingString = `[${embedding.join(',')}]`;

    // Check if embedding already exists
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>`
			SELECT id FROM document_embeddings WHERE "documentId" = ${documentId}
		`;

    if (existing && existing.length > 0) {
      // Update existing embedding
      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE document_embeddings
					SET embedding = ${embeddingString}::vector,
					model = ${model},
					version = ${version},
					"updatedAt" = NOW()
				WHERE "documentId" = ${documentId}`,
      );
    } else {
      // Create new embedding
      const id = await this.prisma.$queryRaw<Array<{ id: string }>>`
				SELECT gen_random_uuid()::text as id
			`;
      const embeddingId = id[0]?.id || documentId;

      await this.prisma.$executeRaw(
        Prisma.sql`INSERT INTO document_embeddings (id, "documentId", embedding, model, version, "createdAt", "updatedAt")
				VALUES (
					${embeddingId},
					${documentId},
					${embeddingString}::vector,
					${model},
					${version},
					NOW(),
					NOW()
				)`,
      );
    }
  }
}
