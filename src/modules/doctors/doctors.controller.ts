import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AtGuard } from '../auth/guards/auth.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { DoctorsService } from './doctors.service';
import { CreateNoteDto } from './dto/create-note.dto';

@ApiTags('Doctors')
@ApiBearerAuth()
@UseGuards(AtGuard)
@Controller('doctor')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @Get('patients')
  @ApiOperation({ summary: 'Lấy thông tin bệnh nhân (Dashboard Overview)' })
  @ResponseMessage('Lấy danh sách thành công')
  getPatients(@CurrentUser() user: JwtPayload) {
    return this.service.getPatients(user.sub);
  }

  @Post('patients/:patientId/notes')
  @ApiOperation({ summary: 'Tạo ghi chú cho bệnh nhân' })
  @ResponseMessage('Tạo ghi chú thành công')
  createNote(
    @CurrentUser() user: JwtPayload,
    @Param('patientId') patientId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.service.createNote(user.sub, patientId, dto);
  }

  @Get('patients/:patientId/notes')
  @ApiOperation({ summary: 'Xem lịch sử ghi chú' })
  @ResponseMessage('Lấy danh sách ghi chú thành công')
  getNotes(
    @CurrentUser() user: JwtPayload,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getNotes(user.sub, patientId);
  }
}
