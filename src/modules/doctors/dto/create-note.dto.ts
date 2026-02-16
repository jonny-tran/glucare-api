import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsNotEmpty({ message: 'Nội dung ghi chú không được để trống' })
  @IsString({ message: 'Nội dung ghi chú phải là chuỗi' })
  @MaxLength(5000, { message: 'Ghi chú không quá 5000 ký tự' })
  content: string;
}
