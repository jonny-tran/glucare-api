import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AtGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { ConnectionsService } from './connections.service';
import { InviteConnectionDto } from './dto/invite-connection.dto';
import { RespondConnectionDto } from './dto/respond-connection.dto';

@ApiTags('Connections')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Gửi lời mời kết nối (Bác sĩ <-> Bệnh nhân)' })
  @ResponseMessage('Gửi lời mời thành công')
  sendInvite(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteConnectionDto,
  ) {
    return this.connectionsService.sendInvite(user.sub, dto);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Phản hồi lời mời (Chấp nhận / Từ chối)' })
  @ResponseMessage('Phản hồi thành công')
  respondConnection(
    @CurrentUser() user: JwtPayload,
    @Param('id') connectionId: string,
    @Body() dto: RespondConnectionDto,
  ) {
    return this.connectionsService.respondConnection(
      user.sub,
      connectionId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách kết nối' })
  @ResponseMessage('Lấy danh sách thành công')
  listConnections(@CurrentUser() user: JwtPayload) {
    return this.connectionsService.listConnections(user.sub);
  }
}
