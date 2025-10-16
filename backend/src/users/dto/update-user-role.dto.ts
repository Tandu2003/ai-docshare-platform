import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'ID vai trò mới',
    example: 'clr1234567890',
  })
  @IsString({ message: 'ID vai trò phải là chuỗi' })
  @IsNotEmpty({ message: 'ID vai trò không được để trống' })
  roleId: string;
}
