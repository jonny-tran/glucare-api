import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ example: 'Running', description: 'Loại hình vận động' })
  @IsString({ message: 'Loại vận động phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập loại vận động' })
  exerciseType: string;

  @ApiProperty({ example: 45, description: 'Thời gian tập luyện (phút)' })
  @IsInt({ message: 'Thời gian phải là số nguyên' })
  @Min(1, { message: 'Thời gian tối thiểu là 1 phút' })
  duration: number;

  @ApiProperty({
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'MEDIUM',
    description: 'Cường độ vận động',
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'], {
    message: 'Cường độ phải là LOW, MEDIUM hoặc HIGH',
  })
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({
    example: 300.5,
    description: 'Lượng calo tiêu thụ (kcal)',
  })
  @IsNumber({}, { message: 'Calo phải là số' })
  @IsOptional()
  caloriesBurned?: number;

  @ApiProperty({
    example: '2024-03-20T08:00:00Z',
    description: 'Thời điểm bắt đầu tập (ISO 8601 UTC)',
  })
  @IsDateString({}, { message: 'Thời gian bắt đầu không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập thời gian bắt đầu' })
  startTime: string;

  @ApiPropertyOptional({ example: 'Chạy bộ buổi sáng', description: 'Ghi chú' })
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}
