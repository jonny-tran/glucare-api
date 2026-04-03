import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AtGuard } from 'src/modules/auth/guards/auth.guard';
import type { JwtPayload } from 'src/modules/auth/interfaces/auth.interface';
import { AgentService } from './agent.service';
import { AiSessionService } from './ai-session.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { UpdateAiSessionDto } from './dto/update-ai-session.dto';

const HEALTH_MEDIA_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'image/jpeg',
  'image/png',
]);

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(AtGuard)
export class AiController {
  constructor(
    private readonly agentService: AgentService,
    private readonly aiSessionService: AiSessionService,
  ) {}

  @Get('sessions')
  @ApiOperation({
    summary: 'Danh sách phiên chat (thread) của người dùng',
    description:
      'Chỉ các phiên chưa bị xóa mềm, sắp xếp theo cập nhật gần nhất.',
  })
  @ResponseMessage('Lấy danh sách phiên chat thành công')
  async listSessions(@CurrentUser() user: JwtPayload) {
    return this.aiSessionService.listSessions(user.sub);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({
    summary: 'Lịch sử tin nhắn trong một phiên (có phân trang)',
    description:
      'Kèm BR-07 (medicalDisclaimer) để client hiển thị khi xuất / xem lại tư vấn.',
  })
  @ApiParam({ name: 'id', description: 'UUID phiên chat', format: 'uuid' })
  @ResponseMessage('Lấy lịch sử tin nhắn thành công')
  async getSessionMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.aiSessionService.getSessionMessages(
      user.sub,
      sessionId,
      page,
      limit,
    );
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Đổi tên phiên chat' })
  @ApiParam({ name: 'id', description: 'UUID phiên chat', format: 'uuid' })
  @ResponseMessage('Cập nhật phiên chat thành công')
  async renameSession(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateAiSessionDto,
  ) {
    return this.aiSessionService.renameSession(user.sub, sessionId, dto);
  }

  @Delete('sessions/:id')
  @ApiOperation({
    summary: 'Xóa mềm phiên chat (soft delete)',
    description:
      'Đánh dấu isDeleted; tin nhắn vẫn tồn tại trong DB cho tuân thủ y tế — có thể dọn sau bằng job nội bộ nếu cần.',
  })
  @ApiParam({ name: 'id', description: 'UUID phiên chat', format: 'uuid' })
  @ResponseMessage('Đã xóa phiên chat')
  async deleteSession(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ) {
    return this.aiSessionService.softDeleteSession(user.sub, sessionId);
  }

  @Post('chat')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Trò chuyện với AI Agent (tùy chọn: file âm thanh/hình ảnh để nhận diện chỉ số đường huyết)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Tin nhắn (bắt buộc nếu không có file)' },
        sessionId: { type: 'string', format: 'uuid' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Âm thanh (.mp3, .wav, .m4a) hoặc ảnh (.jpg, .png)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (HEALTH_MEDIA_MIMES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Định dạng không hỗ trợ: ${file.mimetype}. Dùng mp3, wav, m4a, jpg, png.`,
            ),
            false,
          );
        }
      },
    }),
  )
  @ResponseMessage('AI phản hồi thành công')
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AiChatDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const hasText = !!(dto.message && dto.message.trim());
    if (!hasText && !file) {
      throw new BadRequestException(
        'Vui lòng gửi tin nhắn hoặc file âm thanh/hình ảnh.',
      );
    }
    return this.agentService.chat(user, dto, file);
  }
}
