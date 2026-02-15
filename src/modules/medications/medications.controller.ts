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
import { CreateMedicationDto } from './dto/create-medication.dto';
import {
  MedicationFilterDto,
  UpdateMedicationDto,
} from './dto/medication-filter.dto';
import { MedicationsService } from './medications.service';

@ApiTags('Medications Management')
@ApiBearerAuth()
@Controller('medications')
@UseGuards(AtGuard, RolesGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo nhật ký uống thuốc mới' })
  @ResponseMessage('Ghi nhận uống thuốc thành công')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createMedicationDto: CreateMedicationDto,
  ) {
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }
    return this.medicationsService.create(user.sub, createMedicationDto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lấy lịch sử uống thuốc (phân trang & lọc)' })
  @ResponseMessage('Lấy lịch sử uống thuốc thành công')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: MedicationFilterDto,
  ) {
    return this.medicationsService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết bản ghi thuốc' })
  @ResponseMessage('Lấy chi tiết bản ghi thuốc thành công')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.medicationsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật bản ghi thuốc' })
  @ResponseMessage('Cập nhật bản ghi thuốc thành công')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateMedicationDto: UpdateMedicationDto,
  ) {
    return this.medicationsService.update(id, user.sub, updateMedicationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bản ghi thuốc (Soft Delete)' })
  @ResponseMessage('Xóa bản ghi thuốc thành công')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.medicationsService.remove(id, user.sub);
  }
}
