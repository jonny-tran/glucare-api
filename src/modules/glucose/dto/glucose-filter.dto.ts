import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export enum MealContext {
  BEFORE_MEAL = 'BEFORE_MEAL',
  AFTER_MEAL = 'AFTER_MEAL',
  FASTING = 'FASTING',
  BEDTIME = 'BEDTIME',
}

export enum ReadingType {
  CGM = 'CGM',
  SMBG = 'SMBG',
  MANUAL = 'MANUAL',
}

export class GlucoseFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: MealContext, description: 'Ngữ cảnh bữa ăn' })
  @IsOptional()
  @IsEnum(MealContext)
  mealContext?: MealContext;

  @ApiPropertyOptional({ enum: ReadingType, description: 'Loại thiết bị đo' })
  @IsOptional()
  @IsEnum(ReadingType)
  readingType?: ReadingType;

  @ApiPropertyOptional({ description: 'Giá trị đường huyết tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minVal?: number;

  @ApiPropertyOptional({ description: 'Giá trị đường huyết tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxVal?: number;
}

export class UpdateGlucoseDto {
  @ApiPropertyOptional({ description: 'Chỉ số đường huyết (mg/dL)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  glucoseValue?: number;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: MealContext, description: 'Ngữ cảnh bữa ăn' })
  @IsOptional()
  @IsEnum(MealContext)
  mealContext?: MealContext;

  @ApiPropertyOptional({ description: 'ID bản ghi thuốc (nếu có)' })
  @IsOptional()
  @IsUUID()
  medicationId?: string;

  @ApiPropertyOptional({ description: 'ID bản ghi bữa ăn (nếu có)' })
  @IsOptional()
  @IsUUID()
  mealId?: string;
}
