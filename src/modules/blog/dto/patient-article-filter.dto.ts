import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PatientArticleFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo danh mục' })
  @IsOptional()
  @IsUUID('4', { message: 'ID danh mục phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiProperty({
    description: 'Ngôn ngữ bài viết (BẮT BUỘC)',
    enum: ['VI', 'EN'],
    example: 'VI',
  })
  @IsNotEmpty({ message: 'Ngôn ngữ không được để trống' })
  @IsEnum(['VI', 'EN'], { message: 'Ngôn ngữ phải là VI hoặc EN' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  language: 'VI' | 'EN';
}
