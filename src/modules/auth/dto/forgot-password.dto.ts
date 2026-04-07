import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: '0123456789',
    description: 'Số điện thoại tài khoản (10 chữ số)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @Matches(/^[0-9]{10}$/, {
    message: 'Số điện thoại phải bao gồm đúng 10 chữ số',
  })
  phoneNumber: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'Mật khẩu mới (ít nhất 6 ký tự)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  newPassword: string;
}
