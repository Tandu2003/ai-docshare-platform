import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsString({ message: 'Email or username must be a string' })
  @IsNotEmpty({ message: 'Email or username is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  emailOrUsername: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
