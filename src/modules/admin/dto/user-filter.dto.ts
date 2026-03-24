import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UserRole } from '../../../database/schema';

export class UserFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo vai trò (ADMIN, DOCTOR, PATIENT)',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái tài khoản (PENDING, ACTIVE, BLOCKED)',
    enum: ['PENDING', 'ACTIVE', 'BLOCKED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE', 'BLOCKED'], {
    message: 'Trạng thái không hợp lệ',
  })
  status?: 'PENDING' | 'ACTIVE' | 'BLOCKED';

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên hoặc email',
    example: 'Nguyen',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Bao gồm tài khoản đã xóa mềm',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
