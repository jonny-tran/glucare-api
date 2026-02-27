import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Trạng thái hoạt động của tài khoản',
    example: true,
  })
  @IsNotEmpty({ message: 'Trạng thái hoạt động không được để trống' })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive: boolean;
}
