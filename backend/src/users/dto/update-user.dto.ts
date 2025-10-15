import { IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator'

import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Email của người dùng',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Tên đăng nhập',
    example: 'johndoe',
    minLength: 3,
    maxLength: 30,
  })
  @IsOptional()
  @IsString({ message: 'Tên đăng nhập phải là chuỗi' })
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Tên đăng nhập không được quá 30 ký tự' })
  username?: string;

  @ApiPropertyOptional({
    description: 'Mật khẩu mới',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsOptional()
  @ValidateIf((o) => o.password && o.password.trim().length > 0)
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Tên',
    example: 'John',
  })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi' })
  @MinLength(1, { message: 'Tên không được để trống' })
  @MaxLength(50, { message: 'Tên không được quá 50 ký tự' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Họ',
    example: 'Doe',
  })
  @IsOptional()
  @IsString({ message: 'Họ phải là chuỗi' })
  @MinLength(1, { message: 'Họ không được để trống' })
  @MaxLength(50, { message: 'Họ không được quá 50 ký tự' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: 'URL ảnh đại diện phải là chuỗi' })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Tiểu sử',
    example: 'Software Developer',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Tiểu sử phải là chuỗi' })
  @MaxLength(500, { message: 'Tiểu sử không được quá 500 ký tự' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'ID vai trò',
    example: 'clr1234567890',
  })
  @IsOptional()
  @IsString({ message: 'ID vai trò phải là chuỗi' })
  @MinLength(1, { message: 'ID vai trò không được để trống' })
  roleId?: string;
}
