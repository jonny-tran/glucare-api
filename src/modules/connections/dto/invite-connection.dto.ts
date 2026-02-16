import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteConnectionDto {
  @ApiProperty({
    description: 'Email của người muốn mời (Bác sĩ hoặc Bệnh nhân)',
    example: 'doctor@hospital.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string; // Invite by email is safest for lookup.

  // Could allow targetUserId too if frontend knows it.
}
