import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({
    description: 'Giá trị cấu hình mới (number, string, hoặc object)',
    example: 70,
  })
  @IsDefined({ message: 'Giá trị cấu hình không được để trống' })
  value: unknown;

  @ApiPropertyOptional({
    description: 'Mô tả về cấu hình',
    example: 'Ngưỡng đường huyết tối thiểu an toàn (mg/dL)',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;
}
