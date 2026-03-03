import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
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
import { UpdateConfigDto } from './dto/update-config.dto';
import { SystemConfigService } from './system-config.service';

@ApiTags('Admin - System Configuration')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'admin/configs',
  version: '1',
})
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách toàn bộ cấu hình hệ thống' })
  @ResponseMessage('Lấy danh sách cấu hình thành công')
  async getAllConfigs() {
    return this.systemConfigService.getAllConfigs();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Lấy chi tiết một cấu hình theo key' })
  @ApiParam({
    name: 'key',
    description: 'Config key (GLUCOSE_SAFE_MIN, GLUCOSE_SAFE_MAX)',
  })
  @ResponseMessage('Lấy cấu hình thành công')
  async getConfigByKey(@Param('key') key: string) {
    return this.systemConfigService.getConfigByKey(key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Cập nhật giá trị cấu hình (trigger cache update)' })
  @ApiParam({
    name: 'key',
    description: 'Config key (GLUCOSE_SAFE_MIN, GLUCOSE_SAFE_MAX)',
  })
  @ResponseMessage('Cập nhật cấu hình thành công')
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.systemConfigService.updateConfig(key, dto, user.sub);
  }
}
