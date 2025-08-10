import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class GetDocumentPreviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1; // For PDF pages

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  width?: number = 800;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  height?: number = 600;
}
