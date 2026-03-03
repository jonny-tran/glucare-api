import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class AppointmentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    description: 'Lọc theo trạng thái lịch hẹn',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Lọc từ ngày (ISO 8601)',
    example: '2024-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Lọc đến ngày (ISO 8601)',
    example: '2024-03-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;
}
