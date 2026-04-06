import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export enum PaymentPackageType {
  M = 'M',
  Y = 'Y',
  L = 'L',
}

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'UUID của user cần khởi tạo thanh toán',
    example: '40ad8072-baab-4432-a1c1-e93aeb755534',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Mã gói thanh toán',
    enum: PaymentPackageType,
    example: PaymentPackageType.M,
  })
  @IsNotEmpty()
  @IsEnum(PaymentPackageType)
  packageType: PaymentPackageType;
}
