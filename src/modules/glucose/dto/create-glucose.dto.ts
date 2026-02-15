import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum ReadingType {
  CGM = 'CGM',
  SMBG = 'SMBG',
  MANUAL = 'MANUAL',
}

export enum MealContext {
  BEFORE_MEAL = 'BEFORE_MEAL',
  AFTER_MEAL = 'AFTER_MEAL',
  FASTING = 'FASTING',
  BEDTIME = 'BEDTIME',
}

export class CreateGlucoseDto {
  @ApiProperty({
    description: 'Chỉ số glucose tính bằng mg/dL (20-600)',
    example: 120.5,
    minimum: 20,
    maximum: 600,
  })
  @IsNumber({}, { message: 'Giá trị đường huyết phải là số' })
  @Min(20, { message: 'Giá trị đường huyết tối thiểu là 20 mg/dL' })
  @Max(600, { message: 'Giá trị đường huyết tối đa là 600 mg/dL' })
  glucoseValue: number;

  @ApiProperty({
    description: 'Loại chỉ số đo',
    enum: ReadingType,
    example: ReadingType.MANUAL,
  })
  @IsEnum(ReadingType, { message: 'Loại chỉ số đo không hợp lệ' })
  readingType: ReadingType;

  @ApiProperty({
    description: 'Thời điểm đo so với bữa ăn',
    enum: MealContext,
    example: MealContext.BEFORE_MEAL,
  })
  @IsEnum(MealContext, { message: 'Thời điểm đo không hợp lệ' })
  mealContext: MealContext;

  @ApiProperty({
    description: 'Ghi chú cho lần đo',
    example: 'Cảm thấy chóng mặt',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  notes?: string;

  @ApiProperty({
    description: 'Thời gian ghi nhận (ISO 8601)',
    example: '2023-10-27T10:00:00Z',
  })
  @IsISO8601(
    {},
    { message: 'Thời gian ghi nhận không đúng định dạng ISO 8601' },
  )
  recordedAt: string;

  @ApiProperty({ description: 'ID bản ghi thuốc (nếu có)', required: false })
  @IsOptional()
  @IsString()
  medicationId?: string;

  @ApiProperty({ description: 'ID bản ghi bữa ăn (nếu có)', required: false })
  @IsOptional()
  @IsString()
  mealId?: string;
}
