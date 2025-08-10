import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum PopularPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class GetPopularDocumentsDto {
  @IsOptional()
  @IsEnum(PopularPeriod)
  period?: PopularPeriod = PopularPeriod.WEEK;

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
