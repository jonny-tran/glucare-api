import {
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
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExerciseFilterDto } from './dto/exercise-filter.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('Exercises Management')
@ApiBearerAuth()
@Controller('exercises')
@UseGuards(AtGuard, RolesGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Ghi lại hoạt động vận động mới' })
  @ApiResponse({ status: 201, description: 'Tạo bản ghi vận động thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ResponseMessage('Ghi nhận hoạt động vận động thành công')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(user.sub, dto);
  }

  @Get()
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Lấy danh sách vận động cá nhân (phân trang)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ResponseMessage('Lấy danh sách vận động thành công')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ExerciseFilterDto,
  ) {
    return this.exercisesService.findAll(user.sub, query);
  }

  @Get('patient/:userId')
  @Roles('DOCTOR', 'ADMIN')
  @ApiOperation({
    summary: 'Xem lịch sử vận động của bệnh nhân cụ thể (Doctor/Admin)',
  })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ResponseMessage('Lấy lịch sử vận động của bệnh nhân thành công')
  async findByPatient(
    @Param('userId') userId: string,
    @Query() query: ExerciseFilterDto,
  ) {
    return this.exercisesService.findByPatientUserId(userId, query);
  }

  @Get(':id')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Xem chi tiết bản ghi vận động' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi' })
  @ResponseMessage('Lấy chi tiết vận động thành công')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exercisesService.findOne(id, user.sub);
  }

  @Patch(':id')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Cập nhật thông tin vận động' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi' })
  @ResponseMessage('Cập nhật bản ghi vận động thành công')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @Roles('PATIENT')
  @ApiOperation({ summary: 'Xóa bản ghi vận động (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản ghi' })
  @ResponseMessage('Xóa bản ghi vận động thành công')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.exercisesService.remove(id, user.sub);
  }
}
