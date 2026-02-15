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
import { CreateMealDto } from './dto/create-meal.dto';
import { MealFilterDto, UpdateMealDto } from './dto/meal-filter.dto';
import { MealsService } from './meals.service';

@ApiTags('Meals Management')
@ApiBearerAuth()
@Controller('meals')
@UseGuards(AtGuard, RolesGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo nhật ký bữa ăn mới' })
  @ResponseMessage('Ghi nhận bữa ăn thành công')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createMealDto: CreateMealDto,
  ) {
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }
    return this.mealsService.create(user.sub, createMealDto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lấy lịch sử ăn uống (phân trang & lọc)' })
  @ResponseMessage('Lấy lịch sử bữa ăn thành công')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: MealFilterDto,
  ) {
    return this.mealsService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết bữa ăn' })
  @ResponseMessage('Lấy chi tiết bữa ăn thành công')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.mealsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin bữa ăn' })
  @ResponseMessage('Cập nhật bữa ăn thành công')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateMealDto: UpdateMealDto,
  ) {
    return this.mealsService.update(id, user.sub, updateMealDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bữa ăn (Soft Delete)' })
  @ResponseMessage('Xóa bữa ăn thành công')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.mealsService.remove(id, user.sub);
  }
}
