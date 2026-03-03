import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class PublishArticleDto {
  @ApiProperty({
    description: 'Trạng thái xuất bản (true = Publish, false = Unpublish)',
    example: true,
  })
  @IsNotEmpty({ message: 'Trạng thái xuất bản không được để trống' })
  @IsBoolean({ message: 'Trạng thái xuất bản phải là kiểu boolean' })
  isPublished: boolean;
}
