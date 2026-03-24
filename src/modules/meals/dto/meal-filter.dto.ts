import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CreateMealDto } from './create-meal.dto';

export class UpdateMealDto extends PartialType(CreateMealDto) {}

export enum MealTypeFilter {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export class MealFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Loại bữa ăn',
    enum: MealTypeFilter,
  })
  @IsOptional()
  @IsEnum(MealTypeFilter)
  mealType?: MealTypeFilter;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên món ăn',
    example: 'Phở',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
