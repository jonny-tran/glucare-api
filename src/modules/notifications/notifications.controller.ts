import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AtGuard } from '../auth/guards/auth.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateTokenDto } from './dto/create-token.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  @ApiOperation({ summary: 'Lưu hoặc cập nhật FCM Token cho thiết bị' })
  @ResponseMessage('Lưu thiết bị thành công')
  async saveToken(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTokenDto,
  ) {
    await this.notificationsService.saveToken(
      user.sub,
      dto.fcmToken,
      dto.deviceType,
    );
    return null;
  }
}
