import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DownloadDocumentDto {
  @ApiProperty({
    description: 'IP address of the user',
    example: '192.168.1.1',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({
    description: 'Referrer URL',
    example: 'https://example.com/documents',
    required: false,
  })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiProperty({
    description: 'Document share API key token to bypass point deduction',
    required: false,
  })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
