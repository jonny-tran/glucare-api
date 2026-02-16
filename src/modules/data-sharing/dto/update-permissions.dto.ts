import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdatePermissionsDto {
  @ApiProperty({
    description: 'ID của Bác sĩ (Doctor Profile ID)',
    example: 'doc-uuid',
  })
  @IsUUID()
  doctorId: string;

  @ApiProperty({ description: 'Quyền xem chỉ số đường huyết', example: true })
  @IsBoolean()
  @IsOptional()
  viewGlucose?: boolean;

  @ApiProperty({ description: 'Quyền xem bữa ăn', example: false })
  @IsBoolean()
  @IsOptional()
  viewMeals?: boolean;

  @ApiProperty({ description: 'Quyền xem thuốc', example: true })
  @IsBoolean()
  @IsOptional()
  viewMedications?: boolean;
}
