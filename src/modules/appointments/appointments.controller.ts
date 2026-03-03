import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import type { JwtPayload } from 'src/modules/auth/interfaces/auth.interface';
import { AppointmentsService } from './appointments.service';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@ApiTags('Appointments Management')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(AtGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Patient tạo yêu cầu đặt lịch hẹn mới (Pending)' })
  @ApiResponse({ status: 201, description: 'Tạo lịch hẹn thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc trùng lịch',
  })
  @ApiResponse({
    status: 403,
    description: 'Chưa kết nối với bác sĩ',
  })
  @ResponseMessage('Đặt lịch hẹn thành công')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(user.sub, dto);
  }

  @Get()
  @Roles('PATIENT', 'DOCTOR')
  @ApiOperation({
    summary: 'Lấy danh sách lịch hẹn của tôi (Patient/Doctor)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ResponseMessage('Lấy danh sách lịch hẹn thành công')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filter: AppointmentFilterDto,
  ) {
    return this.appointmentsService.findAll(
      user.sub,
      user.role as 'PATIENT' | 'DOCTOR',
      filter,
    );
  }

  @Get(':id')
  @Roles('PATIENT', 'DOCTOR')
  @ApiOperation({ summary: 'Xem chi tiết lịch hẹn' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch hẹn' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ResponseMessage('Lấy chi tiết lịch hẹn thành công')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.appointmentsService.findOne(
      id,
      user.sub,
      user.role as 'PATIENT' | 'DOCTOR',
    );
  }

  @Patch(':id/status')
  @Roles('PATIENT', 'DOCTOR')
  @ApiOperation({
    summary: 'Cập nhật trạng thái lịch hẹn (Confirm, Cancel, Complete)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({
    status: 400,
    description: 'Chuyển trạng thái không hợp lệ',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch hẹn' })
  @ResponseMessage('Cập nhật trạng thái lịch hẹn thành công')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      id,
      user.sub,
      user.role as 'PATIENT' | 'DOCTOR',
      dto,
    );
  }
}
