import { IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class ViewDocumentDto {
  @ApiProperty({
    description: 'Referrer URL',
    example: 'https://example.com/search',
    required: false,
  })
  @IsOptional()
  @IsString()
  referrer?: string;
}
