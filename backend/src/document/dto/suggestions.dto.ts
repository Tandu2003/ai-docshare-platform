import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class GetSuggestionsDto {
  @IsOptional()
  @IsString()
  q?: string; // Current search query

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;
}

export enum SuggestionType {
  KEYWORD = 'keyword',
  DOCUMENT = 'document',
  CATEGORY = 'category',
}

export interface SuggestionResult {
  type: SuggestionType;
  value: string;
  score: number;
  metadata?: any;
}
