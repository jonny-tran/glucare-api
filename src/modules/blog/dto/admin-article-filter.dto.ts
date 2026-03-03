import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class AdminArticleFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tiêu đề' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo danh mục' })
  @IsOptional()
  @IsUUID('4', { message: 'ID danh mục phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ngôn ngữ', enum: ['VI', 'EN'] })
  @IsOptional()
  @IsEnum(['VI', 'EN'])
  language?: 'VI' | 'EN';

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái xuất bản' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Bao gồm bài viết đã xóa mềm',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
