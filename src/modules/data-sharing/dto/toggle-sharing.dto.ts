import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

export class ToggleSharingDto {
  @ApiProperty({
    description: 'ID của Bác sĩ (Doctor Profile ID)',
    example: 'doc-uuid',
  })
  @IsUUID()
  doctorId: string;

  @ApiProperty({ description: 'Trạng thái chia sẻ dữ liệu', example: true })
  @IsBoolean()
  isActive: boolean;
}
