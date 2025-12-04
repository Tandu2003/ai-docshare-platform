import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './controllers/categories.controller';
import {
  CategoryCrudService,
  CategoryQueryService,
  CategorySuggestionService,
  DefaultCategoriesService,
} from './services';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoryCrudService,
    CategoryQueryService,
    CategorySuggestionService,
    DefaultCategoriesService,
  ],
  exports: [
    CategoriesService,
    CategoryCrudService,
    CategoryQueryService,
    CategorySuggestionService,
    DefaultCategoriesService,
  ],
})
export class CategoriesModule {}
