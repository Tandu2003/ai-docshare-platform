import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  SearchDocumentsDto,
  GetSuggestionsDto,
  GetRecommendationsDto,
  GetPopularDocumentsDto,
  GetRecentDocumentsDto,
  GetTrendingDocumentsDto,
  GetDocumentPreviewDto,
  UpdateDocumentDto,
  GetMyDocumentsDto,
  DuplicateCheckDto,
  SuggestionResult,
  SuggestionType,
  RecommendationResult,
  RecommendationAlgorithm,
  DuplicateCheckResult,
  PopularPeriod,
  TrendingPeriod,
  DocumentStatus,
  MyDocumentsSortBy,
  MyDocumentsOrder,
  SortBy,
} from './dto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ================================
  // SEARCH & DISCOVERY
  // ================================

  async searchDocuments(searchDto: SearchDocumentsDto, userId?: string) {
    const {
      q,
      categoryId,
      tags,
      uploaderId,
      mimeType,
      isPublic,
      isPremium,
      minRating,
      dateFrom,
      dateTo,
      sort,
      order,
      page = 1,
      limit = 10,
    } = searchDto;

    // Build where clause
    const where: Prisma.DocumentWhereInput = {
      isApproved: true,
      isDraft: false,
    };

    // Public filter - if user is not logged in, only show public documents
    if (!userId) {
      where.isPublic = true;
    } else if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    // Text search
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q] } },
      ];
    }

    // Filters
    if (categoryId) where.categoryId = categoryId;
    if (uploaderId) where.uploaderId = uploaderId;
    if (mimeType) where.mimeType = mimeType;
    if (isPremium !== undefined) where.isPremium = isPremium;
    if (minRating) where.averageRating = { gte: minRating };
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Sorting
    const orderBy: Prisma.DocumentOrderByWithRelationInput[] = [];

    switch (sort) {
      case SortBy.RATING:
        orderBy.push({ averageRating: order });
        break;
      case SortBy.DOWNLOADS:
        orderBy.push({ downloadCount: order });
        break;
      case SortBy.VIEWS:
        orderBy.push({ viewCount: order });
        break;
      case SortBy.DATE:
        orderBy.push({ createdAt: order });
        break;
      default: // RELEVANCE
        if (q) {
          // For text search, prioritize title matches, then description
          orderBy.push({ downloadCount: 'desc' }, { averageRating: 'desc' });
        } else {
          orderBy.push({ createdAt: 'desc' });
        }
    }

    // Execute query
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    // Record search history if user is logged in
    if (userId && q) {
      await this.recordSearchHistory(userId, q, searchDto, total);
    }

    // Get aggregated filters for frontend
    const filters = await this.getSearchFilters(where);

    const totalPages = Math.ceil(total / limit);

    return {
      items: documents.map((doc) => this.formatDocumentResponse(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters,
    };
  }

  async getSuggestions(
    suggestionsDto: GetSuggestionsDto
  ): Promise<{ suggestions: SuggestionResult[] }> {
    const { q, limit = 5 } = suggestionsDto;

    const suggestions: SuggestionResult[] = [];

    if (!q || q.length < 2) {
      return { suggestions };
    }

    // Get keyword suggestions from search history
    const searchHistory = await this.prisma.searchHistory.findMany({
      where: {
        query: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: { query: true },
      distinct: ['query'],
      orderBy: { searchedAt: 'desc' },
      take: limit,
    });

    searchHistory.forEach((history) => {
      suggestions.push({
        type: SuggestionType.KEYWORD,
        value: history.query,
        score: 0.8,
      });
    });

    // Get document title suggestions
    const documents = await this.prisma.document.findMany({
      where: {
        isApproved: true,
        isDraft: false,
        isPublic: true,
        title: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: { id: true, title: true, downloadCount: true },
      orderBy: { downloadCount: 'desc' },
      take: limit,
    });

    documents.forEach((doc) => {
      suggestions.push({
        type: SuggestionType.DOCUMENT,
        value: doc.title,
        score: 0.9,
        metadata: { documentId: doc.id },
      });
    });

    // Get category suggestions
    const categories = await this.prisma.category.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: { id: true, name: true },
      take: limit,
    });

    categories.forEach((category) => {
      suggestions.push({
        type: SuggestionType.CATEGORY,
        value: category.name,
        score: 0.7,
        metadata: { categoryId: category.id },
      });
    });

    // Sort by score and limit results
    return {
      suggestions: suggestions.sort((a, b) => b.score - a.score).slice(0, limit),
    };
  }

  async getRecommendations(
    recommendationsDto: GetRecommendationsDto,
    userId?: string
  ): Promise<{ recommendations: RecommendationResult[] }> {
    const {
      algorithm = RecommendationAlgorithm.HYBRID,
      limit = 10,
      categoryId,
    } = recommendationsDto;

    if (!userId) {
      // For anonymous users, return popular documents
      return this.getAnonymousRecommendations(categoryId, limit);
    }

    let recommendations: RecommendationResult[] = [];

    switch (algorithm) {
      case RecommendationAlgorithm.COLLABORATIVE:
        recommendations = await this.getCollaborativeRecommendations(userId, categoryId, limit);
        break;
      case RecommendationAlgorithm.CONTENT:
        recommendations = await this.getContentBasedRecommendations(userId, categoryId, limit);
        break;
      case RecommendationAlgorithm.HYBRID:
        recommendations = await this.getHybridRecommendations(userId, categoryId, limit);
        break;
    }

    return { recommendations };
  }

  async getPopularDocuments(popularDto: GetPopularDocumentsDto) {
    const { period = PopularPeriod.WEEK, categoryId, limit = 10 } = popularDto;

    const where: Prisma.DocumentWhereInput = {
      isApproved: true,
      isDraft: false,
      isPublic: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Calculate date range based on period
    const now = new Date();
    let dateFrom: Date;

    switch (period) {
      case PopularPeriod.DAY:
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case PopularPeriod.WEEK:
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case PopularPeriod.MONTH:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case PopularPeriod.YEAR:
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const documents = await this.prisma.document.findMany({
      where: {
        ...where,
        createdAt: { gte: dateFrom },
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ downloadCount: 'desc' }, { viewCount: 'desc' }, { averageRating: 'desc' }],
      take: limit,
    });

    return {
      documents: documents.map((doc) => ({
        ...this.formatDocumentResponse(doc),
        popularityScore: this.calculatePopularityScore(doc),
      })),
    };
  }

  async getRecentDocuments(recentDto: GetRecentDocumentsDto) {
    const { categoryId, limit = 10 } = recentDto;

    const where: Prisma.DocumentWhereInput = {
      isApproved: true,
      isDraft: false,
      isPublic: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const documents = await this.prisma.document.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      documents: documents.map((doc) => this.formatDocumentResponse(doc)),
    };
  }

  async getTrendingDocuments(trendingDto: GetTrendingDocumentsDto) {
    const { period = TrendingPeriod.WEEK, categoryId, limit = 10 } = trendingDto;

    const where: Prisma.DocumentWhereInput = {
      isApproved: true,
      isDraft: false,
      isPublic: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Calculate date range
    const now = new Date();
    let dateFrom: Date;

    switch (period) {
      case TrendingPeriod.DAY:
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case TrendingPeriod.WEEK:
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case TrendingPeriod.MONTH:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get documents with activity in the period
    const documents = await this.prisma.document.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        downloads: {
          where: {
            downloadedAt: { gte: dateFrom },
          },
        },
      },
      take: limit * 3, // Get more to calculate trends
    });

    // Calculate trending score and sort
    const trendingDocs = documents
      .map((doc) => {
        const recentDownloads = doc.downloads.length;
        const trendingScore = this.calculateTrendingScore(doc, recentDownloads, period);
        const growthRate = this.calculateGrowthRate(doc, recentDownloads, period);

        return {
          ...this.formatDocumentResponse(doc),
          trendingScore,
          growthRate,
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return {
      documents: trendingDocs,
    };
  }

  // ================================
  // VIEW & DOWNLOAD
  // ================================

  async getDocumentById(id: string, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        aiAnalysis: true,
        ratings: userId
          ? {
              where: { userId },
            }
          : false,
        bookmarks: userId
          ? {
              where: { userId },
            }
          : false,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access permissions
    if (!document.isPublic && (!userId || document.uploaderId !== userId)) {
      throw new ForbiddenException('Access denied');
    }

    const userRating = userId && document.ratings?.[0];
    const isBookmarked = userId && document.bookmarks?.length > 0;

    return {
      ...this.formatDocumentResponse(document, true),
      userRating: userRating
        ? {
            rating: userRating.rating,
            createdAt: userRating.createdAt,
          }
        : null,
      isBookmarked: !!isBookmarked,
      canDownload: this.canUserDownload(document, userId),
      canEdit: userId === document.uploaderId,
    };
  }

  async getDocumentPreview(id: string, previewDto: GetDocumentPreviewDto, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        isPublic: true,
        uploaderId: true,
        mimeType: true,
        filePath: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access permissions
    if (!document.isPublic && (!userId || document.uploaderId !== userId)) {
      throw new ForbiddenException('Access denied');
    }

    const { page = 1, width = 800, height = 600 } = previewDto;

    // Generate preview URL (this would integrate with your file service)
    const previewUrl = this.generatePreviewUrl(document, page, width, height);

    // For PDF files, get total pages (mock implementation)
    const totalPages =
      document.mimeType === 'application/pdf' ? await this.getPdfPageCount(document.filePath) : 1;

    return {
      previewUrl,
      totalPages,
      dimensions: { width, height },
    };
  }

  async getDocumentAISummary(id: string, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access permissions
    if (!document.isPublic && (!userId || document.uploaderId !== userId)) {
      throw new ForbiddenException('Access denied');
    }

    if (!document.aiAnalysis) {
      // Trigger AI analysis if not available
      await this.triggerAIAnalysis(id);
      throw new NotFoundException('AI analysis is being processed. Please try again later.');
    }

    return document.aiAnalysis;
  }

  async recordDocumentView(id: string, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { id: true, isPublic: true, uploaderId: true, viewCount: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access permissions
    if (!document.isPublic && (!userId || document.uploaderId !== userId)) {
      throw new ForbiddenException('Access denied');
    }

    // Don't count view if user is the uploader
    if (userId && userId === document.uploaderId) {
      return { viewCount: document.viewCount, message: 'View recorded successfully' };
    }

    // Update view count
    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    // Log activity
    if (userId) {
      await this.logActivity(userId, 'view', 'document', id);
    }

    return {
      viewCount: updatedDocument.viewCount,
      message: 'View recorded successfully',
    };
  }

  // ================================
  // MANAGEMENT
  // ================================

  async updateDocument(id: string, updateDto: UpdateDocumentDto, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { id: true, uploaderId: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.uploaderId !== userId) {
      throw new ForbiddenException('You can only update your own documents');
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.formatDocumentResponse(updatedDocument);
  }

  async deleteDocument(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { id: true, uploaderId: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.uploaderId !== userId) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }

  async getMyDocuments(myDocsDto: GetMyDocumentsDto, userId: string) {
    const {
      status = DocumentStatus.ALL,
      sort = MyDocumentsSortBy.CREATED_AT,
      order = MyDocumentsOrder.DESC,
      page = 1,
      limit = 10,
    } = myDocsDto;

    const where: Prisma.DocumentWhereInput = {
      uploaderId: userId,
    };

    // Status filter
    switch (status) {
      case DocumentStatus.APPROVED:
        where.isApproved = true;
        break;
      case DocumentStatus.PENDING:
        where.isApproved = false;
        break;
      case DocumentStatus.REJECTED:
        // This would require a status field in the schema
        // For now, treating as not approved
        where.isApproved = false;
        break;
    }

    // Sorting
    const orderBy: Prisma.DocumentOrderByWithRelationInput = {};
    switch (sort) {
      case MyDocumentsSortBy.TITLE:
        orderBy.title = order;
        break;
      case MyDocumentsSortBy.DOWNLOADS:
        orderBy.downloadCount = order;
        break;
      case MyDocumentsSortBy.VIEWS:
        orderBy.viewCount = order;
        break;
      default:
        orderBy.createdAt = order;
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: documents.map((doc) => this.formatDocumentResponse(doc)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async checkDuplicate(duplicateDto: DuplicateCheckDto): Promise<DuplicateCheckResult> {
    const { fileHash } = duplicateDto;

    const existingDocuments = await this.prisma.document.findMany({
      where: {
        fileHash,
        isApproved: true,
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      isDuplicate: existingDocuments.length > 0,
      similarDocuments: existingDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        similarityScore: 1.0, // Exact match
        uploader: doc.uploader,
      })),
    };
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private formatDocumentResponse(document: any, includeAI = false) {
    const response = {
      id: document.id,
      title: document.title,
      description: document.description,
      fileName: document.fileName,
      fileSize: document.fileSize?.toString() || '0',
      mimeType: document.mimeType,
      filePath: document.filePath,
      thumbnailPath: document.thumbnailPath,
      uploader: document.uploader,
      category: document.category,
      downloadCount: document.downloadCount,
      viewCount: document.viewCount,
      averageRating: document.averageRating,
      totalRatings: document.totalRatings,
      tags: document.tags,
      isPublic: document.isPublic,
      isPremium: document.isPremium,
      isApproved: document.isApproved,
      language: document.language,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    if (includeAI && document.aiAnalysis) {
      response['aiAnalysis'] = document.aiAnalysis;
    }

    return response;
  }

  private async recordSearchHistory(
    userId: string,
    query: string,
    filters: any,
    resultsCount: number
  ) {
    try {
      await this.prisma.searchHistory.create({
        data: {
          userId,
          query,
          filters: JSON.stringify(filters),
          resultsCount,
          searchedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn('Failed to record search history:', error);
    }
  }

  private async getSearchFilters(baseWhere: Prisma.DocumentWhereInput) {
    // Get available categories
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    // Get popular tags
    const documents = await this.prisma.document.findMany({
      where: baseWhere,
      select: { tags: true },
      take: 1000,
    });

    const tagCount: Record<string, number> = {};
    documents.forEach((doc) => {
      doc.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    const tags = Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag]) => tag);

    return { categories, tags, uploaders: [] };
  }

  private async getAnonymousRecommendations(
    categoryId?: string,
    limit = 10
  ): Promise<{ recommendations: RecommendationResult[] }> {
    const where: Prisma.DocumentWhereInput = {
      isApproved: true,
      isDraft: false,
      isPublic: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const documents = await this.prisma.document.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ downloadCount: 'desc' }, { averageRating: 'desc' }],
      take: limit,
    });

    return {
      recommendations: documents.map((doc) => ({
        document: this.formatDocumentResponse(doc),
        score: this.calculatePopularityScore(doc),
        reason: 'Popular document',
        algorithm: RecommendationAlgorithm.CONTENT,
      })),
    };
  }

  private async getCollaborativeRecommendations(
    userId: string,
    categoryId?: string,
    limit = 10
  ): Promise<RecommendationResult[]> {
    // Simplified collaborative filtering
    // In a real implementation, you'd use more sophisticated algorithms

    // Find users with similar download patterns
    const userDownloads = await this.prisma.download.findMany({
      where: { userId },
      select: { documentId: true },
    });

    const userDocIds = userDownloads.map((d) => d.documentId);

    if (userDocIds.length === 0) {
      return this.getContentBasedRecommendations(userId, categoryId, limit);
    }

    // Find other users who downloaded similar documents
    const similarUsers = await this.prisma.download.findMany({
      where: {
        documentId: { in: userDocIds },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const similarUserIds = similarUsers.map((u) => u.userId);

    // Get documents downloaded by similar users
    const recommendations = await this.prisma.document.findMany({
      where: {
        isApproved: true,
        isDraft: false,
        isPublic: true,
        id: { notIn: userDocIds },
        downloads: {
          some: {
            userId: { in: similarUserIds },
          },
        },
        ...(categoryId && { categoryId }),
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { downloadCount: 'desc' },
      take: limit,
    });

    return recommendations.map((doc) => ({
      document: this.formatDocumentResponse(doc),
      score: 0.8,
      reason: 'Users with similar interests also liked this',
      algorithm: RecommendationAlgorithm.COLLABORATIVE,
    }));
  }

  private async getContentBasedRecommendations(
    userId: string,
    categoryId?: string,
    limit = 10
  ): Promise<RecommendationResult[]> {
    // Get user's download history to understand preferences
    const userActivity = await this.prisma.download.findMany({
      where: { userId },
      include: {
        document: {
          select: {
            categoryId: true,
            tags: true,
          },
        },
      },
      orderBy: { downloadedAt: 'desc' },
      take: 20,
    });

    // Extract preferred categories and tags
    const categoryPrefs: Record<string, number> = {};
    const tagPrefs: Record<string, number> = {};

    userActivity.forEach((activity) => {
      const doc = activity.document;
      categoryPrefs[doc.categoryId] = (categoryPrefs[doc.categoryId] || 0) + 1;
      doc.tags.forEach((tag) => {
        tagPrefs[tag] = (tagPrefs[tag] || 0) + 1;
      });
    });

    const preferredCategories = Object.keys(categoryPrefs);
    const preferredTags = Object.keys(tagPrefs);

    // Find similar documents
    const where: Prisma.DocumentWhereInput = {
      isApproved: true,
      isDraft: false,
      isPublic: true,
      uploaderId: { not: userId },
    };

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (preferredCategories.length > 0) {
      where.categoryId = { in: preferredCategories };
    }

    if (preferredTags.length > 0) {
      where.tags = { hasSome: preferredTags };
    }

    const recommendations = await this.prisma.document.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { averageRating: 'desc' },
      take: limit,
    });

    return recommendations.map((doc) => ({
      document: this.formatDocumentResponse(doc),
      score: 0.7,
      reason: 'Based on your interests',
      algorithm: RecommendationAlgorithm.CONTENT,
    }));
  }

  private async getHybridRecommendations(
    userId: string,
    categoryId?: string,
    limit = 10
  ): Promise<RecommendationResult[]> {
    // Combine collaborative and content-based recommendations
    const [collaborative, contentBased] = await Promise.all([
      this.getCollaborativeRecommendations(userId, categoryId, Math.ceil(limit / 2)),
      this.getContentBasedRecommendations(userId, categoryId, Math.ceil(limit / 2)),
    ]);

    // Merge and deduplicate
    const combined = [...collaborative, ...contentBased];
    const seen = new Set();
    const unique = combined.filter((rec) => {
      const id = rec.document.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Sort by score and take top results
    return unique
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((rec) => ({
        ...rec,
        algorithm: RecommendationAlgorithm.HYBRID,
      }));
  }

  private calculatePopularityScore(document: any): number {
    // Weighted scoring based on downloads, views, and ratings
    const downloadWeight = 0.4;
    const viewWeight = 0.3;
    const ratingWeight = 0.3;

    const downloadScore = Math.min(document.downloadCount / 100, 1) * downloadWeight;
    const viewScore = Math.min(document.viewCount / 1000, 1) * viewWeight;
    const ratingScore = (document.averageRating / 5) * ratingWeight;

    return downloadScore + viewScore + ratingScore;
  }

  private calculateTrendingScore(
    document: any,
    recentDownloads: number,
    period: TrendingPeriod
  ): number {
    // Base score from recent activity
    let baseScore = recentDownloads;

    // Boost for recent uploads
    const daysSinceUpload =
      (Date.now() - new Date(document.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpload <= 7) {
      baseScore *= 1.5;
    }

    // Factor in overall popularity
    const popularityBoost = this.calculatePopularityScore(document) * 0.3;

    return baseScore + popularityBoost;
  }

  private calculateGrowthRate(
    document: any,
    recentDownloads: number,
    period: TrendingPeriod
  ): number {
    // Simple growth rate calculation
    if (document.downloadCount === 0) return 0;

    const periodDays = period === TrendingPeriod.DAY ? 1 : period === TrendingPeriod.WEEK ? 7 : 30;
    const previousDownloads = Math.max(document.downloadCount - recentDownloads, 0);

    if (previousDownloads === 0) return recentDownloads > 0 ? 100 : 0;

    return (recentDownloads / previousDownloads - 1) * 100;
  }

  private canUserDownload(document: any, userId?: string): boolean {
    // Check if user can download the document
    if (!document.isPublic && (!userId || document.uploaderId !== userId)) {
      return false;
    }

    // Add premium check logic here if needed
    if (document.isPremium && userId) {
      // Check if user has premium access
      // This would need user role/subscription checking
    }

    return true;
  }

  private generatePreviewUrl(document: any, page: number, width: number, height: number): string {
    // Generate preview URL - this would integrate with your file processing service
    const baseUrl = process.env.PREVIEW_SERVICE_URL || 'https://preview.example.com';
    return `${baseUrl}/preview/${document.id}?page=${page}&width=${width}&height=${height}`;
  }

  private async getPdfPageCount(filePath: string): Promise<number> {
    // Mock implementation - integrate with PDF processing library
    return 10;
  }

  private async triggerAIAnalysis(documentId: string): Promise<void> {
    // Trigger AI analysis - integrate with AI service
    this.logger.log(`Triggering AI analysis for document: ${documentId}`);
    // Implementation would depend on your AI service
  }

  private async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log activity:', error);
    }
  }
}
