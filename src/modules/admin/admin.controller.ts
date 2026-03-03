import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { UserRole } from 'src/database/schema';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import type { JwtPayload } from 'src/modules/auth/interfaces/auth.interface';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@ApiTags('Admin - Account Management')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'admin',
  version: '1',
})
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Lấy danh sách người dùng (phân trang, filter, search)',
  })
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async getUsers(@Query() query: UserFilterDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái người dùng (Active/Blocked)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ResponseMessage('Cập nhật trạng thái người dùng thành công')
  async updateUserStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(user.sub, id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Xóa mềm tài khoản người dùng (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ResponseMessage('Xóa tài khoản người dùng thành công')
  async softDeleteUser(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.softDeleteUser(user.sub, id);
  }

  @Get('doctors/pending')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ đang chờ duyệt' })
  @ResponseMessage('Lấy danh sách bác sĩ chờ duyệt thành công')
  async getPendingDoctors() {
    return this.adminService.getPendingDoctors();
  }

  @Post('doctors/:id/verify')
  @ApiOperation({ summary: 'Phê duyệt tài khoản bác sĩ (PENDING -> ACTIVE)' })
  @ApiParam({ name: 'id', description: 'Doctor Profile ID (UUID)' })
  @ResponseMessage('Phê duyệt bác sĩ thành công')
  async verifyDoctor(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.verifyDoctor(id);
  }
}
