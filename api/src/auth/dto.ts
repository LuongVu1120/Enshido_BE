import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @MinLength(4, { message: 'Mật khẩu tối thiểu 4 ký tự' })
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString() oldPassword!: string;
  @IsString() @MinLength(4, { message: 'Mật khẩu mới tối thiểu 4 ký tự' }) newPassword!: string;
}
