import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ShareDocumentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60 * 24 * 30)
  expiresInMinutes?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  regenerateToken?: boolean;
}
