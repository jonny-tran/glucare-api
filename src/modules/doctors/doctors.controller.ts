import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AtGuard } from '../auth/guards/auth.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { RequirePermission } from '../data-sharing/decorators/require-permission.decorator';
import { SharingGuard } from '../data-sharing/guards/sharing.guard';
import { GlucoseFilterDto } from '../glucose/dto/glucose-filter.dto';
import { MealFilterDto } from '../meals/dto/meal-filter.dto';
import { MedicationFilterDto } from '../medications/dto/medication-filter.dto';
import { DoctorsService } from './doctors.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { GetPatientsDto } from './dto/get-patients.dto';

@ApiTags('Doctors')
@ApiBearerAuth()
@UseGuards(AtGuard)
@Controller('doctor')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @Get('patients')
  @ApiOperation({ summary: 'Lấy thông tin bệnh nhân (Dashboard Overview)' })
  @ResponseMessage('Lấy danh sách thành công')
  getPatients(@CurrentUser() user: JwtPayload, @Query() query: GetPatientsDto) {
    return this.service.getPatients(user.sub, query.dangerLevel);
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

  @Get('patients/:patientId/glucose')
  @UseGuards(SharingGuard)
  @RequirePermission('VIEW_GLUCOSE')
  @ApiOperation({ summary: 'Xem lịch sử đường huyết của bệnh nhân' })
  @ResponseMessage('Lấy dữ liệu đường huyết thành công')
  async getPatientGlucose(
    @Param('patientId') patientId: string,
    @Query() query: GlucoseFilterDto,
  ) {
    return this.service.getPatientGlucose(patientId, query);
  }

  @Get('patients/:patientId/meals')
  @UseGuards(SharingGuard)
  @RequirePermission('VIEW_MEALS')
  @ApiOperation({ summary: 'Xem lịch sử bữa ăn của bệnh nhân' })
  @ResponseMessage('Lấy dữ liệu bữa ăn thành công')
  async getPatientMeals(
    @Param('patientId') patientId: string,
    @Query() query: MealFilterDto,
  ) {
    return this.service.getPatientMeals(patientId, query);
  }

  @Get('patients/:patientId/medications')
  @UseGuards(SharingGuard)
  @RequirePermission('VIEW_MEDICATIONS')
  @ApiOperation({ summary: 'Xem lịch sử dùng thuốc của bệnh nhân' })
  @ResponseMessage('Lấy dữ liệu dùng thuốc thành công')
  async getPatientMedications(
    @Param('patientId') patientId: string,
    @Query() query: MedicationFilterDto,
  ) {
    return this.service.getPatientMedications(patientId, query);
  }
}
