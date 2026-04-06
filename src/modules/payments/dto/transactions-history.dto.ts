import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TransactionsHistoryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái giao dịch',
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsIn(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'])
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
}

