import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsString({ message: 'Email hoặc tên người dùng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Email hoặc tên người dùng là bắt buộc' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  emailOrUsername: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu là bắt buộc' })
  password: string;
}
