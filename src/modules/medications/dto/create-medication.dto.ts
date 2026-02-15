import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMedicationDto {
  @ApiProperty({ description: 'Tên thuốc', example: 'Metformin' })
  @IsString({ message: 'Tên thuốc phải là chuỗi ký tự' })
  medicineName: string;

  @ApiProperty({ description: 'Liều lượng', required: false, example: 500 })
  @IsOptional()
  @IsNumber({}, { message: 'Liều lượng phải là số' })
  @Min(0, { message: 'Liều lượng không được âm' })
  dosage?: number;

  @ApiProperty({ description: 'Đơn vị tính', required: false, example: 'mg' })
  @IsOptional()
  @IsString({ message: 'Đơn vị phải là chuỗi ký tự' })
  unit?: string;

  @ApiProperty({
    description: 'Thời gian uống (ISO 8601)',
    example: '2026-02-16T10:00:00Z',
  })
  @IsISO8601({}, { message: 'Thời gian không đúng định dạng ISO 8601' })
  recordedAt: string;

  @ApiProperty({ description: 'Ghi chú', required: false })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  notes?: string;
}
