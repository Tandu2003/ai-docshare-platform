import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  CategoryCrudService,
  CategoryQueryService,
  CategorySuggestionService,
  DefaultCategoriesService,
} from './services';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoryQueryService: CategoryQueryService,
    private readonly categoryCrudService: CategoryCrudService,
    private readonly categorySuggestionService: CategorySuggestionService,
    private readonly defaultCategoriesService: DefaultCategoriesService,
  ) {}

  // ==================== Query Operations ====================

  async findAll(includeInactive = true): Promise<any> {
    return this.categoryQueryService.findAll(includeInactive);
  }

  async findById(id: string): Promise<any> {
    return this.categoryQueryService.findById(id);
  }

  async getCategoryWithDocuments(params: {
    id: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt' | 'downloadCount' | 'viewCount' | 'averageRating';
    order?: 'asc' | 'desc';
  }): Promise<any> {
    return this.categoryQueryService.getCategoryWithDocuments(params);
  }

  async getCategoriesForSelection(): Promise<any> {
    return this.categoryQueryService.getCategoriesForSelection();
  }

  // ==================== CRUD Operations ====================

  async createCategory(dto: CreateCategoryDto, user?: any): Promise<any> {
    return this.categoryCrudService.createCategory(dto, user);
  }

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    user?: any,
  ): Promise<any> {
    return this.categoryCrudService.updateCategory(id, dto, user);
  }

  async deleteCategory(id: string, user?: any): Promise<void> {
    return this.categoryCrudService.deleteCategory(id, user);
  }

  // ==================== Suggestion Operations ====================

  async suggestCategoriesForDocument(
    documentId: string,
    userId?: string,
  ): Promise<any> {
    return this.categorySuggestionService.suggestCategoriesForDocument(
      documentId,
      userId,
    );
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
    return this.categorySuggestionService.suggestBestCategoryFromContent(
      contentData,
    );
  }

  // ==================== Initialization ====================

  async initializeDefaultCategories(): Promise<void> {
    return this.defaultCategoriesService.initializeDefaultCategories();
  }
}
