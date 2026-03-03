import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateExerciseDto {
  @ApiPropertyOptional({
    example: 'Swimming',
    description: 'Loại hình vận động',
  })
  @IsString({ message: 'Loại vận động phải là chuỗi ký tự' })
  @IsOptional()
  exerciseType?: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Thời gian tập luyện (phút)',
  })
  @IsInt({ message: 'Thời gian phải là số nguyên' })
  @Min(1, { message: 'Thời gian tối thiểu là 1 phút' })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'HIGH',
    description: 'Cường độ vận động',
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'], {
    message: 'Cường độ phải là LOW, MEDIUM hoặc HIGH',
  })
  @IsOptional()
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({
    example: 450.0,
    description: 'Lượng calo tiêu thụ (kcal)',
  })
  @IsNumber({}, { message: 'Calo phải là số' })
  @IsOptional()
  caloriesBurned?: number;

  @ApiPropertyOptional({
    example: '2024-03-20T09:00:00Z',
    description: 'Thời điểm bắt đầu tập (ISO 8601 UTC)',
  })
  @IsDateString({}, { message: 'Thời gian bắt đầu không hợp lệ' })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: 'Đã tăng tốc độ', description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}
