import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Trạng thái tài khoản mới (ACTIVE hoặc BLOCKED)',
    enum: ['ACTIVE', 'BLOCKED'],
    example: 'BLOCKED',
  })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(['ACTIVE', 'BLOCKED'], {
    message: 'Trạng thái phải là ACTIVE hoặc BLOCKED',
  })
  status: 'ACTIVE' | 'BLOCKED';

  @ApiPropertyOptional({
    description: 'Lý do thay đổi trạng thái (bắt buộc khi Block)',
    example: 'Vi phạm quy định sử dụng dịch vụ',
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  reason?: string;
}
