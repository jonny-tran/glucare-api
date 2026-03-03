import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({
    example: 'uuid-of-doctor',
    description: 'ID của Bác sĩ muốn đặt lịch (doctors.id)',
  })
  @IsUUID('4', { message: 'ID bác sĩ không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn bác sĩ' })
  doctorId: string;

  @ApiProperty({
    example: '2024-12-15T09:00:00Z',
    description: 'Thời gian tái khám (ISO 8601 UTC, phải ở tương lai)',
  })
  @IsDateString({}, { message: 'Thời gian hẹn không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn thời gian hẹn' })
  appointmentDate: string;
}
