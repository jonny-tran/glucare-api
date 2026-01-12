import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class RegisterPatientDto {
  @ApiProperty({
    example: '0123456789',
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
    example: 'Nguyễn Văn A',
    description: 'Họ và tên đầy đủ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @Transform(({ value }: { value: string }) => value?.trim())
  fullName: string;

  @ApiProperty({
    example: 'MALE',
    description: 'Giới tính',
    enum: Gender,
  })
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  gender: Gender;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Ngày sinh (YYYY-MM-DD)',
  })
  @Type(() => Date)
  @IsDate({ message: 'Ngày sinh không hợp lệ' })
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: Date;
}
