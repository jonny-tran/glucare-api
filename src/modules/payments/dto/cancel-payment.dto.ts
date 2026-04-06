import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CancelPaymentDto {
  @ApiPropertyOptional({
    description:
      'Transaction ID cần hủy. Nếu không truyền, hệ thống sẽ hủy giao dịch pending gần nhất của user',
    example: '5fb9f69a-3e1a-44f0-98df-f16f95a5aa18',
  })
  @IsOptional()
  @IsUUID()
  transactionId?: string;
}
