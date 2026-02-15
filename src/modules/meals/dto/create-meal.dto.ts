import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
// export { MealType }; // Removed

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export class CreateMealDto {
  @ApiProperty({ description: 'Tên món ăn', example: 'Phở bò' })
  @IsString({ message: 'Tên món ăn phải là chuỗi ký tự' })
  foodName: string;

  @ApiProperty({
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
    description: 'Loại bữa ăn',
    example: 'BREAKFAST',
  })
  @IsEnum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], {
    message: 'Loại bữa ăn không hợp lệ',
  })
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

  @ApiProperty({
    description: 'Lượng calo (kcal)',
    required: false,
    example: 500,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Calories phải là số' })
  @Min(0, { message: 'Calories không được âm' })
  calories?: number;

  @ApiProperty({ description: 'Lượng carb (g)', required: false, example: 50 })
  @IsOptional()
  @IsNumber({}, { message: 'Carbs phải là số' })
  @Min(0, { message: 'Carbs không được âm' })
  carbs?: number;

  @ApiProperty({
    description: 'Thời gian ăn (ISO 8601)',
    example: '2026-02-16T10:00:00Z',
  })
  @IsISO8601({}, { message: 'Thời gian không đúng định dạng ISO 8601' })
  recordedAt: string;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  notes?: string;
}
