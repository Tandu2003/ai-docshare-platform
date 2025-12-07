export { CategoriesService } from './categories.service';
export {
  CategorySuggestionService,
  DefaultCategoriesService,
} from './services';
// Controllers
export { CategoriesController } from './controllers/categories.controller';
// Module
export { CategoriesModule } from './categories.module';
// DTOs
export { CreateCategoryDto, UpdateCategoryDto } from './dto';
export type {
  CategoryWithParent,
  CategoryWithMetrics,
  CategorySuggestion,
  CategorySuggestionItem,
  CategoryTreeNode,
} from './interfaces';

// Constants
export {
  DEFAULT_CATEGORY_NAME,
  DEFAULT_CATEGORY_DESCRIPTION,
  CATEGORY_ERROR_MESSAGES,
  CATEGORY_SUCCESS_MESSAGES,
  MAX_CATEGORY_DEPTH,
  MAX_CATEGORY_NAME_LENGTH,
} from './constants';
