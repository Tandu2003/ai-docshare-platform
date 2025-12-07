import { IsOptional, IsString } from 'class-validator';

export class RejectDocumentDto {
  @IsString()
  reason: string;
  @IsOptional()
  @IsString()
  notes?: string;
}
