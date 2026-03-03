import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { PatientArticleFilterDto } from '../dto/patient-article-filter.dto';
import { ArticlePatientService } from '../services/article-patient.service';

@ApiTags('Patient - Knowledge Base')
@ApiBearerAuth()
@UseGuards(AtGuard, RolesGuard)
@Roles(UserRole.PATIENT)
@Controller({
  path: 'patient/articles',
  version: '1',
})
export class ArticlePatientController {
  constructor(private readonly articlePatientService: ArticlePatientService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài viết (chỉ bài đã xuất bản)' })
  @ResponseMessage('Lấy danh sách bài viết thành công')
  async findAll(@Query() query: PatientArticleFilterDto) {
    return this.articlePatientService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết bài viết (tăng viewCount)' })
  @ApiParam({ name: 'id', description: 'Article ID (UUID)' })
  @ResponseMessage('Lấy chi tiết bài viết thành công')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.articlePatientService.findById(id);
  }
}
