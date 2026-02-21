import {
  Body,
  Controller,
  Delete,
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
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(AtGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly service: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo nhắc nhở mới' })
  @ResponseMessage('Tạo nhắc nhở thành công')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReminderDto) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhắc nhở' })
  @ResponseMessage('Lấy danh sách nhắc nhở thành công')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhắc nhở' })
  @ResponseMessage('Lấy thông tin nhắc nhở thành công')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nhắc nhở' })
  @ResponseMessage('Cập nhật nhắc nhở thành công')
  update(@Param('id') id: string, @Body() dto: UpdateReminderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhắc nhở' })
  @ResponseMessage('Xóa nhắc nhở thành công')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
