import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum TrendingPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class GetTrendingDocumentsDto {
  @IsOptional()
  @IsEnum(TrendingPeriod)
  period?: TrendingPeriod = TrendingPeriod.WEEK;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}
