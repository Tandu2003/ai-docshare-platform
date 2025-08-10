import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum SortBy {
  RELEVANCE = 'relevance',
  RATING = 'rating',
  DOWNLOADS = 'downloads',
  VIEWS = 'views',
  DATE = 'date',
}

export enum Order {
  ASC = 'asc',
  DESC = 'desc',
}

export class SearchDocumentsDto {
  @IsOptional()
  @IsString()
  q?: string; // Search query

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @IsOptional()
  @IsString()
  uploaderId?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPremium?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsString()
  dateFrom?: string; // ISO 8601

  @IsOptional()
  @IsString()
  dateTo?: string; // ISO 8601

  @IsOptional()
  @IsEnum(SortBy)
  sort?: SortBy = SortBy.RELEVANCE;

  @IsOptional()
  @IsEnum(Order)
  order?: Order = Order.DESC;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
