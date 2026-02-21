import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTokenDto {
  @ApiProperty({ description: 'FCM Token của thiết bị' })
  @IsString()
  @IsNotEmpty({ message: 'fcmToken không được để trống' })
  fcmToken: string;

  @ApiProperty({ description: 'Loại thiết bị: ios, android', required: false })
  @IsString()
  @IsOptional()
  deviceType?: string;
}
