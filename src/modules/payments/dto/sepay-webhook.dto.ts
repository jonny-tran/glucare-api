import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum SePayTransferType {
  IN = 'in',
  OUT = 'out',
}

export class SePayWebhookDto {
  @ApiProperty({ description: 'UUID giao dịch SePay' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Tên ngân hàng', example: 'Vietcombank' })
  @IsString()
  @IsOptional()
  gateway?: string;

  @ApiProperty({ description: 'Thời gian giao dịch', example: '2026-04-06 10:00:00' })
  @IsString()
  @IsNotEmpty()
  transactionDate: string;

  @ApiProperty({ description: 'Số tài khoản', example: '0123456789' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ description: 'Nội dung chuyển khoản' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ enum: SePayTransferType, description: 'Loại giao dịch' })
  @IsEnum(SePayTransferType)
  transferType: SePayTransferType;

  @ApiProperty({ description: 'Số tiền giao dịch' })
  @Type(() => Number)
  @IsNumber()
  transferAmount: number;

  @ApiProperty({ description: 'Số dư lũy kế' })
  @Type(() => Number)
  @IsNumber()
  accumulated: number;

  @ApiProperty({ description: 'Mã tham chiếu', required: false })
  @IsString()
  @IsOptional()
  referenceCode?: string;
}
