import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum RecommendationAlgorithm {
  COLLABORATIVE = 'collaborative',
  CONTENT = 'content',
  HYBRID = 'hybrid',
}

export class GetRecommendationsDto {
  @IsOptional()
  @IsEnum(RecommendationAlgorithm)
  algorithm?: RecommendationAlgorithm = RecommendationAlgorithm.HYBRID;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export interface RecommendationResult {
  document: any;
  score: number;
  reason: string;
  algorithm: RecommendationAlgorithm;
}
