import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAiSessionDto {
  @ApiProperty({
    description: 'Tên hiển thị cho cuộc trò chuyện',
    example: 'Tư vấn chỉ số sau bữa tối',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
}
