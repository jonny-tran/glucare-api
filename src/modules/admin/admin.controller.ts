import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { UserRole } from 'src/database/schema';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@ApiTags('Admin')
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
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async getUsers(@Query() query: UserFilterDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái người dùng (Kích hoạt/Khóa)' })
  @ResponseMessage('Cập nhật trạng thái người dùng thành công')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto);
  }

  @Get('doctors/pending')
  @ApiOperation({ summary: 'Lấy danh sách bác sĩ đang chờ duyệt' })
  @ResponseMessage('Lấy danh sách bác sĩ chờ duyệt thành công')
  async getPendingDoctors() {
    return this.adminService.getPendingDoctors();
  }

  @Patch('doctors/:id/verify')
  @ApiOperation({ summary: 'Phê duyệt tài khoản bác sĩ' })
  @ResponseMessage('Phê duyệt bác sĩ thành công')
  async verifyDoctor(@Param('id') id: string) {
    return this.adminService.verifyDoctor(id);
  }
}
