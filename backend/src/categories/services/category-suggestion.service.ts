import { PrismaService } from '../../prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class CategorySuggestionService {
  constructor(private readonly prisma: PrismaService) {}
  async suggestCategoriesForDocument(documentId: string, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        uploaderId: true,
        categoryId: true,
        aiAnalysis: {
          select: { suggestedTags: true, keyPoints: true, summary: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Không tìm thấy tài liệu');
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: { select: { name: true } } },
      });
      const isOwner = document.uploaderId === userId;
      const isAdmin = user?.role?.name === 'admin';
      if (!isOwner && !isAdmin) {
        throw new ForbiddenException(
          'Chỉ chủ sở hữu hoặc admin mới có thể yêu cầu gợi ý danh mục',
        );
      }
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        icon: true,
        color: true,
      },
    });

    const textParts = [
      document.title,
      document.description,
      ...(document.tags || []),
      ...((document.aiAnalysis?.suggestedTags as string[]) || []),
      ...((document.aiAnalysis?.keyPoints as string[]) || []),
      document.aiAnalysis?.summary || '',
    ].filter(Boolean);
    const text = textParts.join(' ').toLowerCase();

    const docTokens = new Set(this.tokenize(text));

    const scored = categories
      .map(c => {
        const catText = `${c.name} ${c.description || ''}`;
        const catTokens = new Set(this.tokenize(catText));
        let score = 0;
        catTokens.forEach(t => {
          if (docTokens.has(t)) score += 1;
        });
        if (text.includes(c.name.toLowerCase())) score += 3;
        return { ...c, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      documentId,
      currentCategoryId: document.categoryId,
      suggestions: scored.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        parentId: c.parentId,
        score: c.score,
        confidence: Math.min(100, Math.round((c.score / 10) * 100)),
      })),
      basis: {
        documentTags: document.tags || [],
        aiSuggestedTags: (document.aiAnalysis?.suggestedTags as string[]) || [],
      },
    };
  }

  async suggestBestCategoryFromContent(contentData: {
    title?: string;
    description?: string;
    tags?: string[];
    summary?: string;
    keyPoints?: string[];
  }): Promise<{
    categoryId: string | null;
    categoryName: string | null;
    confidence: number;
    allSuggestions: Array<{
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
      parentId: string | null;
      score: number;
      confidence: number;
    }>;
  }> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        icon: true,
        color: true,
      },
    });

    if (categories.length === 0) {
      return {
        categoryId: null,
        categoryName: null,
        confidence: 0,
        allSuggestions: [],
      };
    }

    const textParts = [
      contentData.title,
      contentData.description,
      ...(contentData.tags || []),
      ...(contentData.keyPoints || []),
      contentData.summary || '',
    ].filter(Boolean);
    const text = textParts.join(' ').toLowerCase();
    const docTokens = new Set(this.tokenize(text));

    const scored = categories
      .map(c => {
        const catText = `${c.name} ${c.description || ''}`;
        const catTokens = new Set(this.tokenize(catText));
        let score = 0;

        catTokens.forEach(t => {
          if (docTokens.has(t)) score += 1;
        });

        if (text.includes(c.name.toLowerCase())) score += 5;

        const catNameWords = c.name.toLowerCase().split(/\s+/);
        catNameWords.forEach(word => {
          if (word.length > 2 && text.includes(word)) score += 2;
        });

        if (c.parentId && score > 0) score += 1;

        return { ...c, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    const maxPossibleScore = 20;
    const allSuggestions = scored.slice(0, 5).map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      score: c.score,
      confidence: Math.min(100, Math.round((c.score / maxPossibleScore) * 100)),
    }));

    const bestMatch = scored[0];
    if (bestMatch) {
      return {
        categoryId: bestMatch.id,
        categoryName: bestMatch.name,
        confidence: Math.min(
          100,
          Math.round((bestMatch.score / maxPossibleScore) * 100),
        ),
        allSuggestions,
      };
    }

    const defaultCategory =
      categories.find(c => c.name === 'Khác') || categories[0];
    return {
      categoryId: defaultCategory?.id || null,
      categoryName: defaultCategory?.name || null,
      confidence: 10,
      allSuggestions: [],
    };
  }

  async getCategoriesForSelection(): Promise<
    Array<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      color: string | null;
      parentId: string | null;
      parentName: string | null;
      isParent: boolean;
    }>
  > {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      parentName: c.parent?.name || null,
      isParent: c.children.length > 0,
    }));
  }

  private tokenize(s: string): string[] {
    return s
      .toLowerCase()
      .split(/[^a-zA-Z0-9à-ỹÀ-Ỹ]+/)
      .filter(w => w.length > 2);
  }
}
