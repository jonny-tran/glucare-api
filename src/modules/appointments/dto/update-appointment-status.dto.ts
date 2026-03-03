import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
    example: 'CONFIRMED',
    description: 'Trạng thái mới của lịch hẹn',
  })
  @IsEnum(['CONFIRMED', 'CANCELLED', 'COMPLETED'], {
    message: 'Trạng thái phải là CONFIRMED, CANCELLED hoặc COMPLETED',
  })
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

  @ApiPropertyOptional({
    example: 'Bác sĩ có ca mổ cấp cứu đột xuất',
    description: 'Bắt buộc nếu status là CANCELLED',
  })
  @ValidateIf((o: UpdateAppointmentStatusDto) => o.status === 'CANCELLED')
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @IsNotEmpty({
    message: 'Lý do hủy là bắt buộc khi trạng thái là CANCELLED',
  })
  @IsOptional()
  reason?: string;
}
