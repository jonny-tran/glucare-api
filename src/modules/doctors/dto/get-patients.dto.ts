import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DangerLevel {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  GREY = 'GREY',
}

export class GetPatientsDto {
  @ApiPropertyOptional({
    enum: DangerLevel,
    description: 'Lọc theo mức độ nguy hiểm',
  })
  @IsOptional()
  @IsEnum(DangerLevel)
  dangerLevel?: DangerLevel;
}
