import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({
    enum: ['M', 'F', 'O'],
    description: 'Giới tính (bệnh nhân)',
  })
  @IsOptional()
  @IsEnum(['M', 'F', 'O'])
  gender?: 'M' | 'F' | 'O';

  @ApiPropertyOptional({
    example: '1990-01-01',
    description: 'Ngày sinh YYYY-MM-DD (bệnh nhân)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Chuyên khoa (bác sĩ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialization?: string;

  @ApiPropertyOptional({ description: 'Bệnh viện / cơ sở công tác (bác sĩ)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hospital?: string;
}
