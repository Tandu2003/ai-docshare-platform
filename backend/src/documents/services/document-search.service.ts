import { EmbeddingService } from '@/ai/embedding.service';
import {
  HybridSearchResult,
  VectorSearchService,
} from '@/ai/vector-search.service';
import { EmbeddingTextBuilderService } from '@/common/services/embedding-text-builder.service';
import { SystemSettingsService } from '@/common/system-settings.service';
import { FilesService } from '@/files/files.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DocumentModerationStatus, Prisma } from '@prisma/client';

/** Search filters */
interface SearchFilters {
  readonly categoryId?: string;
  readonly tags?: string[];
  readonly language?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/** Search result document */
interface SearchResultDocument {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly isPublic: boolean;
  readonly isApproved: boolean;
  readonly moderationStatus: DocumentModerationStatus;
  readonly tags: string[];
  readonly language: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly uploaderId: string;
  readonly categoryId: string | null;
  readonly category: any;
  readonly uploader: {
    readonly id: string;
    readonly username: string;
    readonly firstName: string | null;
    readonly lastName: string | null;
  };
  readonly downloadCount: number;
  readonly downloadCost: number;
  readonly viewCount: number;
  readonly averageRating: number;
  readonly files: any[];
  readonly similarityScore?: number;
}

/** Search response */
interface SearchResponse {
  readonly documents: SearchResultDocument[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly searchMethod: string;
}

@Injectable()
export class DocumentSearchService {
  private readonly logger = new Logger(DocumentSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorSearchService: VectorSearchService,
    private readonly systemSettings: SystemSettingsService,
    private readonly filesService: FilesService,
    private readonly embeddingTextBuilder: EmbeddingTextBuilderService,
  ) {}

  async searchDocuments(
    query: string,
    page: number = 1,
    limit: number = 10,
    userId?: string,
    userRole?: string,
    filters?: SearchFilters,
  ): Promise<SearchResponse> {
    try {
      const normalizedQuery = query.trim();
      const skip = (page - 1) * limit;
      const searchStrategy = 'hybrid' as const;

      this.logger.log(
        `Searching documents: "${normalizedQuery.substring(0, 50)}..."`,
      );

      const fetchLimit = Math.max(limit, Math.min(limit * (page + 1), 100));

      const vectorFilters = this.buildVectorFilters(filters, userRole);
      let searchResults = await this.performHybridSearch(
        normalizedQuery,
        userId,
        userRole,
        fetchLimit,
        vectorFilters,
      );

      // Fallback to keyword search if no results
      if (searchResults.length === 0) {
        this.logger.warn('Hybrid search returned no results; falling back');
        searchResults = await this.performKeywordSearch(
          normalizedQuery,
          fetchLimit,
          vectorFilters,
        );
      }

      const documentIds = searchResults
        .slice(skip, skip + limit)
        .map(r => r.documentId);

      if (documentIds.length === 0) {
        return {
          documents: [],
          total: searchResults.length,
          page,
          limit,
          searchMethod: searchStrategy,
        };
      }

      const documents = await this.fetchDocuments(
        documentIds,
        filters,
        userRole,
      );

      const transformedDocuments = await this.transformDocuments(
        documents,
        documentIds,
        searchResults,
        userId,
      );

      return {
        documents: transformedDocuments,
        total: searchResults.length,
        page,
        limit,
        searchMethod: searchStrategy,
      };
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw new InternalServerErrorException('Không thể tìm kiếm tài liệu');
    }
  }

  async generateDocumentEmbedding(documentId: string): Promise<void> {
    try {
      this.logger.log(`Generating embedding for document ${documentId}`);

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        include: {
          files: {
            include: { file: true },
            orderBy: { order: 'asc' },
          },
          aiAnalysis: true,
        },
      });

      if (!document) {
        this.logger.warn(
          `Document ${documentId} not found for embedding generation`,
        );
        return;
      }

      const textContent = this.buildEmbeddingText(document);

      if (!textContent || textContent.trim().length === 0) {
        this.logger.warn(
          `No text content available for embedding document ${documentId}`,
        );
        return;
      }

      const embedding = await this.embeddingService.generateEmbedding(
        textContent.trim(),
      );

      await this.prisma.documentEmbedding.upsert({
        where: { documentId },
        update: {
          embedding,
          updatedAt: new Date(),
        },
        create: {
          documentId,
          embedding,
        },
      });

      this.logger.log(
        `Embedding generated for document ${documentId} (dim: ${embedding.length})`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating embedding for document ${documentId}:`,
        error,
      );
      // Don't throw - embedding generation is not critical
    }
  }

  async regenerateAllEmbeddings(): Promise<{
    processed: number;
    failed: number;
  }> {
    this.logger.log('Starting bulk embedding regeneration');

    const documents = await this.prisma.document.findMany({
      where: {
        isApproved: true,
        isPublic: true,
      },
      select: { id: true },
    });

    let processed = 0;
    let failed = 0;

    for (const doc of documents) {
      try {
        await this.generateDocumentEmbedding(doc.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to generate embedding for document ${doc.id}:`,
          error,
        );
        failed++;
      }
    }

    this.logger.log(
      `Bulk embedding regeneration completed: ${processed} processed, ${failed} failed`,
    );

    return { processed, failed };
  }

  // ============ Private Helper Methods ============

  private buildVectorFilters(
    filters?: SearchFilters,
    userRole?: string,
  ): {
    categoryId?: string;
    tags?: string[];
    language?: string;
    isPublic?: boolean;
    isApproved?: boolean;
  } {
    const vectorFilters: {
      categoryId?: string;
      tags?: string[];
      language?: string;
      isPublic?: boolean;
      isApproved?: boolean;
    } = {
      categoryId: filters?.categoryId,
      tags: filters?.tags,
      language: filters?.language,
      isApproved: true,
    };

    if (userRole !== 'admin') {
      vectorFilters.isPublic = true;
    }

    return vectorFilters;
  }

  private async performHybridSearch(
    query: string,
    userId?: string,
    userRole?: string,
    limit: number = 100,
    filters?: any,
  ): Promise<HybridSearchResult[]> {
    return this.vectorSearchService.hybridSearch({
      query,
      userId,
      userRole,
      limit,
      threshold: 0.4,
      filters,
    });
  }

  private async performKeywordSearch(
    query: string,
    limit: number,
    filters: any,
  ): Promise<HybridSearchResult[]> {
    const fallbackResults = await this.vectorSearchService.keywordSearch({
      query,
      limit,
      filters,
    });

    return fallbackResults.map(result => ({
      documentId: result.documentId,
      textScore: result.textScore,
      combinedScore: result.textScore,
    }));
  }

  private async fetchDocuments(
    documentIds: string[],
    filters?: SearchFilters,
    userRole?: string,
  ): Promise<any[]> {
    const where: Prisma.DocumentWhereInput = {
      id: { in: documentIds },
      isApproved: true,
      moderationStatus: DocumentModerationStatus.APPROVED,
    };

    if (userRole !== 'admin') {
      where.isPublic = true;
    }

    if (filters?.categoryId) {
      // Get child categories to include documents from sub-categories
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: filters.categoryId, isActive: true },
        select: { id: true },
      });

      const categoryIds = [
        filters.categoryId,
        ...childCategories.map(c => c.id),
      ];

      where.categoryId = { in: categoryIds };
    }

    if (filters?.language) {
      where.language = filters.language;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return this.prisma.document.findMany({
      where,
      include: {
        files: {
          include: { file: true },
          orderBy: { order: 'asc' },
        },
        category: true,
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  private async transformDocuments(
    documents: any[],
    orderedIds: string[],
    searchResults: HybridSearchResult[],
    userId?: string,
  ): Promise<SearchResultDocument[]> {
    const settings = await this.systemSettings.getPointsSettings();

    // Order documents by search result order
    const orderedDocuments = orderedIds
      .map(id => documents.find(doc => doc.id === id))
      .filter((doc): doc is NonNullable<typeof doc> => doc !== undefined);

    return Promise.all(
      orderedDocuments.map(async document => {
        const filesData = document.files.map((df: any) => ({
          id: df.file.id,
          originalName: df.file.originalName,
          fileName: df.file.fileName,
          mimeType: df.file.mimeType,
          fileSize: df.file.fileSize,
          order: df.order,
        }));

        const filesWithSecureUrls =
          await this.filesService.addSecureUrlsToFiles(filesData, { userId });

        const isOwner = document.uploaderId === userId;
        const downloadCost = document.downloadCost ?? settings.downloadCost;

        const searchResult = searchResults.find(
          r => r.documentId === document.id,
        );

        return {
          id: document.id,
          title: document.title,
          description: document.description,
          isPublic: document.isPublic,
          isApproved: document.isApproved,
          moderationStatus: document.moderationStatus,
          tags: document.tags,
          language: document.language,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          uploaderId: document.uploaderId,
          categoryId: document.categoryId,
          category: document.category,
          uploader: document.uploader,
          downloadCount: document.downloadCount,
          downloadCost: isOwner ? 0 : downloadCost,
          viewCount: document.viewCount,
          averageRating: document.averageRating,
          files: filesWithSecureUrls,
          similarityScore: searchResult?.combinedScore,
        };
      }),
    );
  }

  private buildEmbeddingText(document: {
    title: string;
    description: string | null;
    tags: string[];
    aiAnalysis: { summary: string | null; keyPoints?: string[] | null } | null;
  }): string {
    return this.embeddingTextBuilder.buildSearchEmbeddingText({
      title: document.title,
      description: document.description,
      tags: document.tags,
      aiAnalysis: document.aiAnalysis,
    });
  }
}
