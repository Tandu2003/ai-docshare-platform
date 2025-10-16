import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApproveDocumentDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
