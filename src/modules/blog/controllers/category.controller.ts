import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { UserRole } from 'src/database/schema';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { CategoryFilterDto } from '../dto/category-filter.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryService } from '../services/category.service';

@ApiTags('Admin - Category Management')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'admin/categories',
  version: '1',
})
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục (phân trang, search)' })
  @ResponseMessage('Lấy danh sách danh mục thành công')
  async findAll(@Query() query: CategoryFilterDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ResponseMessage('Lấy chi tiết danh mục thành công')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ResponseMessage('Tạo danh mục thành công')
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ResponseMessage('Cập nhật danh mục thành công')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm danh mục (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ResponseMessage('Xóa danh mục thành công')
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục danh mục đã xóa' })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ResponseMessage('Khôi phục danh mục thành công')
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.restore(id);
  }
}
