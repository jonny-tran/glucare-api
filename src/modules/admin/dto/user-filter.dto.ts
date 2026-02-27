import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { UserRole } from 'src/database/schema';

export class UserFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo vai trò (ADMIN, DOCTOR, PATIENT)',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động của tài khoản',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  isActive?: boolean;
}
