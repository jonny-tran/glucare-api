import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginAdminDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Địa chỉ email Admin',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu đăng nhập (ít nhất 6 ký tự)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  password: string;
}

export class LoginUserDto {
  @ApiProperty({
    example: '0123456789',
    description: 'Số điện thoại đăng nhập (10 chữ số)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @Matches(/^[0-9]{10}$/, {
    message: 'Số điện thoại phải bao gồm đúng 10 chữ số',
  })
  phoneNumber: string;

  @ApiProperty({
    example: 'password123',
    description: 'Mật khẩu đăng nhập (ít nhất 6 ký tự)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  password: string;
}
