import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Tiêu đề bài viết',
    example: 'Hướng dẫn đo đường huyết tại nhà',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Tiêu đề không được vượt quá 500 ký tự' })
  title: string;

  @ApiProperty({ description: 'Nội dung bài viết (HTML hoặc Markdown)' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString({ message: 'Nội dung phải là chuỗi ký tự' })
  content: string;

  @ApiProperty({ description: 'ID danh mục', example: 'uuid-here' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsUUID('4', { message: 'ID danh mục phải là UUID hợp lệ' })
  categoryId: string;

  @ApiProperty({
    description: 'Ngôn ngữ bài viết',
    enum: ['VI', 'EN'],
    example: 'VI',
  })
  @IsNotEmpty({ message: 'Ngôn ngữ không được để trống' })
  @IsEnum(['VI', 'EN'], { message: 'Ngôn ngữ phải là VI hoặc EN' })
  language: 'VI' | 'EN';

  @ApiPropertyOptional({ description: 'URL ảnh bìa bài viết' })
  @IsOptional()
  @IsString({ message: 'URL ảnh bìa phải là chuỗi ký tự' })
  thumbnailUrl?: string;
}
