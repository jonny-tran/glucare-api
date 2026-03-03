import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { UserRole } from 'src/database/schema';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { DashboardService } from './services/dashboard.service';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'admin/dashboard',
  version: '1',
})
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Lấy dữ liệu tổng quan Dashboard (đọc từ Cache)' })
  @ResponseMessage('Lấy dữ liệu Dashboard thành công')
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Kích hoạt tính toán lại dữ liệu Dashboard ngay lập tức',
  })
  @ResponseMessage('Đã cập nhật dữ liệu Dashboard')
  async forceRefresh() {
    return this.dashboardService.forceRefresh();
  }
}
