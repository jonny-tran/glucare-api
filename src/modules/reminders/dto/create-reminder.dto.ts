import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateReminderDto {
  @ApiProperty({ description: 'ID của loại thuốc (nếu có)', required: false })
  @IsUUID(4, { message: 'medicationId phải là UUID hợp lệ' })
  @IsOptional()
  medicationId?: string;

  @ApiProperty({ description: 'Tiêu đề nhắc nhở (VD: Uống thuốc tiểu đường)' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({
    description: 'Loại nhắc nhở',
    enum: ['MEDICINE', 'MEASUREMENT'],
  })
  @IsEnum(['MEDICINE', 'MEASUREMENT'])
  @IsNotEmpty()
  type: 'MEDICINE' | 'MEASUREMENT';

  @ApiProperty({
    description: 'Giờ nhắc nhở định dạng HH:mm',
    example: '08:30',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Giờ nhắc nhở phải có định dạng HH:mm',
  })
  @IsNotEmpty()
  time: string;

  @ApiProperty({
    description: 'Các ngày trong tuần (0: CN, 1: T2, ..., 6: T7)',
    example: [1, 3, 5],
  })
  @IsArray()
  @IsNotEmpty()
  daysOfWeek: number[];

  @ApiProperty({
    description: 'Múi giờ của thiết bị (VD: Asia/Ho_Chi_Minh)',
    required: false,
    default: 'Asia/Ho_Chi_Minh',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ description: 'Trạng thái kích hoạt', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
