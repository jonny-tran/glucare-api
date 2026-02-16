import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AtGuard } from '../auth/guards/auth.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { DataSharingService } from './data-sharing.service';
import { ToggleSharingDto } from './dto/toggle-sharing.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@ApiTags('Data Sharing')
@ApiBearerAuth()
@UseGuards(AtGuard)
@Controller('data-sharing')
export class DataSharingController {
  constructor(private readonly dataSharingService: DataSharingService) {}

  @Get('settings/:doctorId')
  @ApiOperation({ summary: 'Xem quyền chia sẻ với một Bác sĩ' })
  @ResponseMessage('Lấy thông tin thành công')
  getSettings(
    @CurrentUser() user: JwtPayload,
    @Param('doctorId') doctorId: string,
  ) {
    return this.dataSharingService.getSettings(user.sub, doctorId);
  }

  @Patch('permissions')
  @ApiOperation({ summary: 'Cập nhật danh sách quyền cho phép' })
  @ResponseMessage('Cập nhật quyền thành công')
  updatePermissions(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePermissionsDto,
  ) {
    return this.dataSharingService.updatePermissions(user.sub, dto);
  }

  @Patch('toggle')
  @ApiOperation({ summary: 'Bật / Tắt chia sẻ dữ liệu' })
  @ResponseMessage('Cập nhật trạng thái thành công')
  toggleSharing(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ToggleSharingDto,
  ) {
    return this.dataSharingService.toggleSharing(user.sub, dto);
  }
}
