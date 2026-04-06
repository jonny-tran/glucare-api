import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SePayQueryDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo reference_number, transaction_content, code',
    example: 'don hang 123',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Lấy giao dịch mới từ UUID giao dịch cuối',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  since_id?: string;

  @ApiPropertyOptional({ description: 'Số trang', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi mỗi trang',
    example: 20,
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 20;

  @ApiPropertyOptional({
    description: 'UUID tài khoản ngân hàng',
    example: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
  })
  @IsOptional()
  @IsUUID()
  bank_account_id?: string;

  @ApiPropertyOptional({
    description: 'UUID tài khoản ảo',
    example: 'a2b3c4d5-e6f7-8901-bcde-f12345678901',
  })
  @IsOptional()
  @IsUUID()
  va_id?: string;

  @ApiPropertyOptional({
    description: 'Loại giao dịch',
    enum: ['in', 'out'],
    example: 'in',
  })
  @IsOptional()
  @IsIn(['in', 'out'])
  transfer_type?: 'in' | 'out';

  @ApiPropertyOptional({
    description: 'Trạng thái webhook',
    enum: [0, 1],
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  webhook_success?: 0 | 1;

  @ApiPropertyOptional({
    description:
      'Định dạng thời gian trả về. Truyền iso8601 để nhận timestamp ISO 8601',
    enum: ['iso8601'],
    example: 'iso8601',
  })
  @IsOptional()
  @IsIn(['iso8601'])
  timestamp_format?: 'iso8601';
}
