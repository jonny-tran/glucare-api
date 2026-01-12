import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({
    example: '0987654321',
    description: 'Số điện thoại đăng ký (10 chữ số)',
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
    description: 'Mật khẩu (ít nhất 6 ký tự)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  password: string;

  @ApiProperty({
    example: 'BS. Nguyễn Văn B',
    description: 'Họ và tên đầy đủ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @Transform(({ value }: { value: string }) => value?.trim())
  fullName: string;

  @ApiProperty({
    example: 'DOC-123456',
    description: 'Số giấy phép hành nghề',
  })
  @IsString()
  @IsNotEmpty({ message: 'Số giấy phép hành nghề không được để trống' })
  @Transform(({ value }: { value: string }) => value?.trim())
  licenseNumber: string;

  @ApiProperty({
    example: 'Nội tiết',
    description: 'Chuyên khoa',
    required: false,
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  specialization?: string;

  @ApiProperty({
    example: 'Bệnh viện Chợ Rẫy',
    description: 'Nơi công tác',
    required: false,
  })
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  hospital?: string;
}
