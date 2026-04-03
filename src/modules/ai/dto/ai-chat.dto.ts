import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AiChatDto {
  @ApiPropertyOptional({
    description:
      'Nội dung tin nhắn (bắt buộc nếu không gửi file âm thanh/hình ảnh)',
    example: 'Cho tôi xem lịch sử đường huyết 7 ngày gần đây',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({
    description: 'Session chat hiện tại (nếu tiếp tục hội thoại)',
    example: '6fd85cb0-f16b-4f92-8144-f4e71e9ff8f1',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
