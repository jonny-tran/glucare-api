import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import type { JwtPayload } from 'src/modules/auth/interfaces/auth.interface';
import { CreateGlucoseDto } from './dto/create-glucose.dto';
import { GlucoseFilterDto, UpdateGlucoseDto } from './dto/glucose-filter.dto';
import { GlucoseService } from './glucose.service';

@ApiTags('Glucose Management')
@ApiBearerAuth()
@Controller('glucose')
@UseGuards(AtGuard, RolesGuard)
export class GlucoseController {
  constructor(private readonly glucoseService: GlucoseService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo chỉ số đường huyết mới' })
  @ResponseMessage('Ghi nhận chỉ số đường huyết thành công')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body()
    createGlucoseDto: CreateGlucoseDto,
  ) {
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng trong yêu cầu');
    }
    return this.glucoseService.create(user.sub, createGlucoseDto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy dữ liệu tổng quan (mới nhất & trung bình)' })
  @ResponseMessage('Lấy dữ liệu tổng quan thành công')
  async getDashboard(@CurrentUser() user: JwtPayload) {
    return this.glucoseService.getDashboardData(user.sub);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Lấy dữ liệu phân tích (TIR, HbA1c, Biểu đồ) theo số ngày',
  })
  @ResponseMessage('Lấy dữ liệu phân tích thành công')
  async getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: number,
  ) {
    const daysInt = days ? Number(days) : 7;
    return this.glucoseService.getAnalytics(user.sub, daysInt);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lấy lịch sử đo đường huyết có bộ lọc' })
  @ResponseMessage('Lấy lịch sử đo đường huyết thành công')
  async getHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: GlucoseFilterDto,
  ) {
    return this.glucoseService.getHistory(user.sub, query);
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Lấy báo cáo tổng hợp sức khỏe' })
  @ResponseMessage('Lấy báo cáo sức khỏe thành công')
  async getReportSummary(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: number,
  ) {
    const daysInt = days ? Number(days) : 7;
    return this.glucoseService.getReportSummary(user.sub, daysInt);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết chỉ số đường huyết' })
  @ResponseMessage('Lấy chi tiết đường huyết thành công')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.glucoseService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật chỉ số đường huyết' })
  @ResponseMessage('Cập nhật chỉ số đường huyết thành công')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateGlucoseDto: UpdateGlucoseDto,
  ) {
    return this.glucoseService.update(id, user.sub, updateGlucoseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chỉ số đường huyết (Soft Delete)' })
  @ResponseMessage('Xóa chỉ số đường huyết thành công')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.glucoseService.remove(id, user.sub);
  }
}
