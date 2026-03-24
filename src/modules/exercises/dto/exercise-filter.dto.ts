import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ExerciseFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ngày bắt đầu',
    example: '2024-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ngày kết thúc',
    example: '2024-03-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    description: 'Lọc theo cường độ vận động',
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'], {
    message: 'Cường độ phải là LOW, MEDIUM hoặc HIGH',
  })
  intensity?: string;
}
