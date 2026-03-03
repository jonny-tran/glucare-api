import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AdminArticleFilterDto } from '../dto/admin-article-filter.dto';
import { CreateArticleDto } from '../dto/create-article.dto';
import { PublishArticleDto } from '../dto/publish-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { ArticleAdminService } from '../services/article-admin.service';

@ApiTags('Admin - Article Management')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({
  path: 'admin/articles',
  version: '1',
})
export class ArticleAdminController {
  constructor(private readonly articleAdminService: ArticleAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài viết (Admin view - cả Draft)' })
  @ResponseMessage('Lấy danh sách bài viết thành công')
  async findAll(@Query() query: AdminArticleFilterDto) {
    return this.articleAdminService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID (UUID)' })
  @ResponseMessage('Lấy chi tiết bài viết thành công')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.articleAdminService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo bài viết mới (mặc định Draft)' })
  @ResponseMessage('Tạo bài viết thành công')
  async create(@Body() dto: CreateArticleDto) {
    return this.articleAdminService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật nội dung bài viết' })
  @ApiParam({ name: 'id', description: 'Article ID (UUID)' })
  @ResponseMessage('Cập nhật bài viết thành công')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articleAdminService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Chuyển đổi trạng thái Publish/Unpublish' })
  @ApiParam({ name: 'id', description: 'Article ID (UUID)' })
  @ResponseMessage('Cập nhật trạng thái xuất bản thành công')
  async publishToggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishArticleDto,
  ) {
    return this.articleAdminService.publishToggle(id, dto.isPublished);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm bài viết (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'Article ID (UUID)' })
  @ResponseMessage('Xóa bài viết thành công')
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.articleAdminService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục bài viết đã xóa' })
  @ApiParam({ name: 'id', description: 'Article ID (UUID)' })
  @ResponseMessage('Khôi phục bài viết thành công')
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.articleAdminService.restore(id);
  }
}
