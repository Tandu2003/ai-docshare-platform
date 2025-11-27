import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: {
    parent: {
      select: {
        id: true;
        name: true;
        icon: true;
        color: true;
      };
    };
  };
}>;

interface CategoryWithMetrics extends CategoryWithParent {
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private validateRole(user: any, requiredRoles: string[]): void {
    if (!user || !user.role) {
      throw new ForbiddenException(
        'Yêu cầu đăng nhập để thực hiện thao tác này',
      );
    }

    const userRole = user.role.name;
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Chỉ có ${requiredRoles.join(' hoặc ')} mới có thể thực hiện thao tác này`,
      );
    }
  }

  private async attachMetrics(
    categories: CategoryWithParent[],
  ): Promise<CategoryWithMetrics[]> {
    if (categories.length === 0) {
      return [];
    }

    const categoryIds = categories.map(category => category.id);

    const aggregates = await this.prisma.document.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: {
          in: categoryIds,
        },
      },
      _count: {
        categoryId: true,
      },
      _sum: {
        downloadCount: true,
        viewCount: true,
      },
    });

    const metricsMap = new Map<
      string,
      { documentCount: number; totalDownloads: number; totalViews: number }
    >();
    aggregates.forEach(aggregate => {
      metricsMap.set(aggregate.categoryId, {
        documentCount: aggregate._count?.categoryId ?? 0,
        totalDownloads: Number(aggregate._sum?.downloadCount ?? 0),
        totalViews: Number(aggregate._sum?.viewCount ?? 0),
      });
    });

    return categories.map(category => {
      const metrics = metricsMap.get(category.id);
      return {
        ...category,
        documentCount: metrics?.documentCount ?? 0,
        totalDownloads: metrics?.totalDownloads ?? 0,
        totalViews: metrics?.totalViews ?? 0,
      };
    });
  }

  private mapCategoryResponse(category: CategoryWithMetrics) {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      parentId: category.parentId,
      isActive: category.isActive,
      documentCount: category.documentCount,
      totalDownloads: category.totalDownloads,
      totalViews: category.totalViews,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      parent: category.parent
        ? {
            id: category.parent.id,
            name: category.parent.name,
            icon: category.parent.icon,
            color: category.parent.color,
          }
        : null,
    };
  }

  async findAll(includeInactive = true) {
    const categories = await this.prisma.category.findMany({
      where: includeInactive
        ? undefined
        : {
            isActive: true,
          },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const categoriesWithMetrics = await this.attachMetrics(categories);
    return categoriesWithMetrics.map(category =>
      this.mapCategoryResponse(category),
    );
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  async getCategoryWithDocuments(params: {
    id: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'downloadCount' | 'viewCount' | 'averageRating';
    order?: 'asc' | 'desc';
  }) {
    const {
      id,
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc',
    } = params;

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, icon: true, color: true } },
        children: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            isActive: true,
          },
        },
      },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.min(Math.max(1, limit), 100);

    const documentWhere = {
      categoryId: id,
      isApproved: true,
      isPublic: true,
      isDraft: false,
    };

    const [total, documents] = await this.prisma.$transaction([
      this.prisma.document.count({ where: documentWhere }),
      this.prisma.document.findMany({
        where: documentWhere,
        orderBy: { [sort]: order },
        skip,
        take,
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
              icon: true,
              color: true,
            },
          },
        },
      }),
    ]);

    const [categoryWithMetrics] = await this.attachMetrics([category as any]);

    return {
      category: {
        ...this.mapCategoryResponse(categoryWithMetrics),
        children: category.children?.filter(c => c.isActive) || [],
      },
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.max(1, Math.ceil(total / take)),
      },
      documents,
    };
  }

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

    // Permission check: owner or admin
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

    // Build text corpus from document metadata and AI analysis
    const textParts = [
      document.title,
      document.description,
      ...(document.tags || []),
      ...((document.aiAnalysis?.suggestedTags as string[]) || []),
      ...((document.aiAnalysis?.keyPoints as string[]) || []),
      document.aiAnalysis?.summary || '',
    ].filter(Boolean);
    const text = textParts.join(' ').toLowerCase();

    // Tokenize for Vietnamese-friendly matching
    const tokenize = (s: string) =>
      s
        .toLowerCase()
        .split(/[^a-zA-Z0-9à-ỹÀ-Ỹ]+/)
        .filter(w => w.length > 2);
    const docTokens = new Set(tokenize(text));

    // Score categories by keyword overlap
    const scored = categories
      .map(c => {
        const catText = `${c.name} ${c.description || ''}`;
        const catTokens = new Set(tokenize(catText));
        let score = 0;
        catTokens.forEach(t => {
          if (docTokens.has(t)) score += 1;
        });
        // Boost for exact name match in text
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

  /**
   * Gợi ý category phù hợp nhất dựa trên nội dung tài liệu
   * Sử dụng khi người dùng không chọn category hoặc muốn AI tự động chọn
   * @param contentData - Thông tin về nội dung tài liệu (title, description, tags, summary, keyPoints)
   * @returns Category ID phù hợp nhất hoặc null nếu không tìm thấy
   */
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
    // Lấy tất cả categories đang active
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

    // Build text corpus từ nội dung tài liệu
    const textParts = [
      contentData.title,
      contentData.description,
      ...(contentData.tags || []),
      ...(contentData.keyPoints || []),
      contentData.summary || '',
    ].filter(Boolean);
    const text = textParts.join(' ').toLowerCase();

    // Tokenize cho matching tiếng Việt
    const tokenize = (s: string) =>
      s
        .toLowerCase()
        .split(/[^a-zA-Z0-9à-ỹÀ-Ỹ]+/)
        .filter(w => w.length > 2);
    const docTokens = new Set(tokenize(text));

    // Tính điểm cho từng category
    const scored = categories
      .map(c => {
        const catText = `${c.name} ${c.description || ''}`;
        const catTokens = new Set(tokenize(catText));
        let score = 0;

        // Điểm cơ bản từ keyword overlap
        catTokens.forEach(t => {
          if (docTokens.has(t)) score += 1;
        });

        // Bonus cho exact name match
        if (text.includes(c.name.toLowerCase())) score += 5;

        // Bonus cho partial name match (tên category xuất hiện một phần)
        const catNameWords = c.name.toLowerCase().split(/\s+/);
        catNameWords.forEach(word => {
          if (word.length > 2 && text.includes(word)) score += 2;
        });

        // Ưu tiên category con (cụ thể hơn) nếu có parent
        if (c.parentId && score > 0) score += 1;

        return { ...c, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    // Tính confidence dựa trên score
    const maxPossibleScore = 20; // Ước tính điểm tối đa có thể đạt được
    const allSuggestions = scored.slice(0, 5).map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      parentId: c.parentId,
      score: c.score,
      confidence: Math.min(100, Math.round((c.score / maxPossibleScore) * 100)),
    }));

    // Lấy category tốt nhất
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

    // Nếu không tìm thấy match, trả về category "Khác" hoặc category đầu tiên
    const defaultCategory =
      categories.find(c => c.name === 'Khác') || categories[0];
    return {
      categoryId: defaultCategory?.id || null,
      categoryName: defaultCategory?.name || null,
      confidence: 10, // Confidence thấp vì không có match
      allSuggestions: [],
    };
  }

  /**
   * Lấy danh sách tất cả categories để hiển thị cho người dùng chọn
   * Bao gồm cả cấu trúc cha-con
   */
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
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
          },
        },
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

  private async validateParent(
    categoryId: string | undefined,
    parentId?: string,
  ) {
    if (!parentId) {
      return;
    }

    if (categoryId && categoryId === parentId) {
      throw new BadRequestException(
        'Danh mục không thể là danh mục cha của chính nó',
      );
    }

    const parentExists = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentExists) {
      throw new BadRequestException('Không tìm thấy danh mục cha');
    }
  }

  async createCategory(dto: CreateCategoryDto, user?: any) {
    // Validate role - chỉ admin mới có thể tạo category
    this.validateRole(user, ['admin']);

    const parentId = dto.parentId?.trim() || undefined;
    await this.validateParent(undefined, parentId);

    const category = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        icon: dto.icon,
        color: dto.color,
        parentId: parentId ?? null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, user?: any) {
    // Validate role - chỉ admin mới có thể cập nhật category
    this.validateRole(user, ['admin']);

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const parentProvided = dto.parentId !== undefined;
    const trimmedParentId =
      parentProvided && typeof dto.parentId === 'string'
        ? dto.parentId.trim()
        : dto.parentId;
    const normalizedParentId =
      typeof trimmedParentId === 'string' && trimmedParentId.length > 0
        ? trimmedParentId
        : undefined;

    if (parentProvided) {
      await this.validateParent(id, normalizedParentId);
    }

    const data: Prisma.CategoryUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      const trimmedDescription = dto.description.trim();
      data.description = trimmedDescription || null;
    }

    if (dto.icon !== undefined) {
      data.icon = dto.icon;
    }

    if (dto.color !== undefined) {
      data.color = dto.color;
    }

    if (parentProvided) {
      data.parentId = normalizedParentId ?? null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    const category = await this.prisma.category.update({
      where: { id },
      data,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    const [categoryWithMetrics] = await this.attachMetrics([category]);
    return this.mapCategoryResponse(categoryWithMetrics);
  }

  async deleteCategory(id: string, user?: any) {
    // Validate role - chỉ admin mới có thể xóa category
    this.validateRole(user, ['admin']);

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException('Không thể xóa danh mục có danh mục con');
    }

    const documentCount = await this.prisma.document.count({
      where: { categoryId: id },
    });

    if (documentCount > 0) {
      throw new BadRequestException(
        'Không thể xóa danh mục có tài liệu liên kết',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }

  /**
   * Danh sách categories mặc định cho hệ thống
   * Người dùng có thể chọn khi upload tài liệu
   * Admin có thể thêm/sửa/xóa sau
   */
  private getDefaultCategories() {
    return [
      // Giáo dục & Học tập
      {
        name: 'Giáo dục',
        description: 'Tài liệu giáo dục, sách giáo khoa, bài giảng',
        icon: '📚',
        color: '#3B82F6',
        sortOrder: 1,
        children: [
          {
            name: 'Toán học',
            description: 'Tài liệu về toán học các cấp',
            icon: '🔢',
            color: '#6366F1',
          },
          {
            name: 'Vật lý',
            description: 'Tài liệu về vật lý',
            icon: '⚛️',
            color: '#8B5CF6',
          },
          {
            name: 'Hóa học',
            description: 'Tài liệu về hóa học',
            icon: '🧪',
            color: '#A855F7',
          },
          {
            name: 'Sinh học',
            description: 'Tài liệu về sinh học',
            icon: '🧬',
            color: '#D946EF',
          },
          {
            name: 'Ngữ văn',
            description: 'Tài liệu ngữ văn, văn học',
            icon: '📖',
            color: '#EC4899',
          },
          {
            name: 'Tiếng Anh',
            description: 'Tài liệu học tiếng Anh',
            icon: '🇬🇧',
            color: '#F43F5E',
          },
          {
            name: 'Lịch sử',
            description: 'Tài liệu về lịch sử',
            icon: '🏛️',
            color: '#EF4444',
          },
          {
            name: 'Địa lý',
            description: 'Tài liệu về địa lý',
            icon: '🌍',
            color: '#F97316',
          },
        ],
      },
      // Công nghệ thông tin
      {
        name: 'Công nghệ thông tin',
        description: 'Lập trình, phần mềm, công nghệ',
        icon: '💻',
        color: '#10B981',
        sortOrder: 2,
        children: [
          {
            name: 'Lập trình',
            description: 'Tài liệu lập trình các ngôn ngữ',
            icon: '👨‍💻',
            color: '#14B8A6',
          },
          {
            name: 'Web Development',
            description: 'Phát triển web, frontend, backend',
            icon: '🌐',
            color: '#06B6D4',
          },
          {
            name: 'Mobile Development',
            description: 'Phát triển ứng dụng di động',
            icon: '📱',
            color: '#0EA5E9',
          },
          {
            name: 'Database',
            description: 'Cơ sở dữ liệu, SQL, NoSQL',
            icon: '🗄️',
            color: '#0284C7',
          },
          {
            name: 'AI & Machine Learning',
            description: 'Trí tuệ nhân tạo, học máy',
            icon: '🤖',
            color: '#2563EB',
          },
          {
            name: 'DevOps',
            description: 'DevOps, CI/CD, Cloud',
            icon: '☁️',
            color: '#4F46E5',
          },
          {
            name: 'An ninh mạng',
            description: 'Bảo mật, an toàn thông tin',
            icon: '🔐',
            color: '#7C3AED',
          },
        ],
      },
      // Kinh tế & Kinh doanh
      {
        name: 'Kinh tế & Kinh doanh',
        description: 'Tài liệu về kinh tế, tài chính, kinh doanh',
        icon: '💼',
        color: '#F59E0B',
        sortOrder: 3,
        children: [
          {
            name: 'Tài chính',
            description: 'Tài chính cá nhân, doanh nghiệp',
            icon: '💰',
            color: '#D97706',
          },
          {
            name: 'Kế toán',
            description: 'Kế toán, kiểm toán',
            icon: '📊',
            color: '#B45309',
          },
          {
            name: 'Marketing',
            description: 'Marketing, quảng cáo',
            icon: '📈',
            color: '#92400E',
          },
          {
            name: 'Quản trị',
            description: 'Quản trị kinh doanh',
            icon: '🎯',
            color: '#78350F',
          },
          {
            name: 'Khởi nghiệp',
            description: 'Startup, khởi nghiệp',
            icon: '🚀',
            color: '#EA580C',
          },
        ],
      },
      // Y tế & Sức khỏe
      {
        name: 'Y tế & Sức khỏe',
        description: 'Tài liệu y học, chăm sóc sức khỏe',
        icon: '🏥',
        color: '#EF4444',
        sortOrder: 4,
        children: [
          {
            name: 'Y học',
            description: 'Tài liệu y học, bệnh học',
            icon: '👨‍⚕️',
            color: '#DC2626',
          },
          {
            name: 'Dược học',
            description: 'Dược phẩm, thuốc',
            icon: '💊',
            color: '#B91C1C',
          },
          {
            name: 'Dinh dưỡng',
            description: 'Dinh dưỡng, chế độ ăn',
            icon: '🥗',
            color: '#991B1B',
          },
          {
            name: 'Thể dục thể thao',
            description: 'Tập luyện, thể thao',
            icon: '🏃',
            color: '#7F1D1D',
          },
        ],
      },
      // Nghệ thuật & Thiết kế
      {
        name: 'Nghệ thuật & Thiết kế',
        description: 'Nghệ thuật, đồ họa, thiết kế',
        icon: '🎨',
        color: '#EC4899',
        sortOrder: 5,
        children: [
          {
            name: 'Đồ họa',
            description: 'Thiết kế đồ họa, UI/UX',
            icon: '🖌️',
            color: '#DB2777',
          },
          {
            name: 'Nhiếp ảnh',
            description: 'Nhiếp ảnh, chỉnh sửa ảnh',
            icon: '📷',
            color: '#BE185D',
          },
          {
            name: 'Video',
            description: 'Sản xuất video, dựng phim',
            icon: '🎬',
            color: '#9D174D',
          },
          {
            name: 'Âm nhạc',
            description: 'Âm nhạc, sản xuất nhạc',
            icon: '🎵',
            color: '#831843',
          },
        ],
      },
      // Luật & Pháp lý
      {
        name: 'Luật & Pháp lý',
        description: 'Văn bản pháp luật, tài liệu pháp lý',
        icon: '⚖️',
        color: '#6B7280',
        sortOrder: 6,
      },
      // Khoa học xã hội
      {
        name: 'Khoa học xã hội',
        description: 'Xã hội học, tâm lý học, triết học',
        icon: '🧠',
        color: '#8B5CF6',
        sortOrder: 7,
        children: [
          {
            name: 'Tâm lý học',
            description: 'Tâm lý học, tâm lý trị liệu',
            icon: '🧩',
            color: '#7C3AED',
          },
          {
            name: 'Xã hội học',
            description: 'Nghiên cứu xã hội',
            icon: '👥',
            color: '#6D28D9',
          },
          {
            name: 'Triết học',
            description: 'Triết học, tư tưởng',
            icon: '💭',
            color: '#5B21B6',
          },
        ],
      },
      // Kỹ năng mềm
      {
        name: 'Kỹ năng mềm',
        description: 'Kỹ năng giao tiếp, lãnh đạo, phát triển bản thân',
        icon: '🎯',
        color: '#14B8A6',
        sortOrder: 8,
        children: [
          {
            name: 'Giao tiếp',
            description: 'Kỹ năng giao tiếp, thuyết trình',
            icon: '🗣️',
            color: '#0D9488',
          },
          {
            name: 'Lãnh đạo',
            description: 'Kỹ năng lãnh đạo, quản lý',
            icon: '👔',
            color: '#0F766E',
          },
          {
            name: 'Phát triển bản thân',
            description: 'Self-improvement, động lực',
            icon: '🌱',
            color: '#115E59',
          },
        ],
      },
      // Ngôn ngữ
      {
        name: 'Ngôn ngữ',
        description: 'Học ngoại ngữ, từ điển, ngữ pháp',
        icon: '🌏',
        color: '#0EA5E9',
        sortOrder: 9,
        children: [
          {
            name: 'Tiếng Nhật',
            description: 'Học tiếng Nhật',
            icon: '🇯🇵',
            color: '#0284C7',
          },
          {
            name: 'Tiếng Hàn',
            description: 'Học tiếng Hàn',
            icon: '🇰🇷',
            color: '#0369A1',
          },
          {
            name: 'Tiếng Trung',
            description: 'Học tiếng Trung',
            icon: '🇨🇳',
            color: '#075985',
          },
          {
            name: 'Tiếng Pháp',
            description: 'Học tiếng Pháp',
            icon: '🇫🇷',
            color: '#0C4A6E',
          },
        ],
      },
      // Khác
      {
        name: 'Khác',
        description: 'Các tài liệu khác không thuộc danh mục cụ thể',
        icon: '📁',
        color: '#9CA3AF',
        sortOrder: 99,
      },
    ];
  }

  /**
   * Khởi tạo categories mặc định khi server start
   * Chỉ tạo nếu chưa có category nào trong database
   */
  async initializeDefaultCategories(): Promise<void> {
    // Kiểm tra xem đã có category nào chưa
    const existingCount = await this.prisma.category.count();

    if (existingCount > 0) {
      return; // Đã có categories, không cần khởi tạo
    }

    const defaultCategories = this.getDefaultCategories();

    for (const category of defaultCategories) {
      // Tạo category cha
      const parent = await this.prisma.category.create({
        data: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      });

      // Tạo categories con nếu có
      if ('children' in category && category.children) {
        let childOrder = 1;
        for (const child of category.children) {
          await this.prisma.category.create({
            data: {
              name: child.name,
              description: child.description,
              icon: child.icon,
              color: child.color,
              parentId: parent.id,
              sortOrder: childOrder++,
              isActive: true,
            },
          });
        }
      }
    }
  }
}
