import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Tên danh mục',
    example: 'Kiến thức cơ bản',
  })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên danh mục không được vượt quá 255 ký tự' })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả danh mục',
    example: 'Các bài viết cung cấp kiến thức nền tảng về tiểu đường',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;
}
