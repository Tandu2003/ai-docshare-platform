import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Trạng thái xác thực email',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái xác thực phải là boolean' })
  isVerified?: boolean;
}
