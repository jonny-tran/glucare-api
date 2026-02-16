import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum ConnectionAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export class RespondConnectionDto {
  @ApiProperty({
    description: 'Hành động phản hồi lời mời',
    enum: ConnectionAction,
    example: ConnectionAction.ACCEPT,
  })
  @IsEnum(ConnectionAction)
  @IsNotEmpty()
  action: ConnectionAction;

  // We map action to DB status 'ACTIVE' or 'REJECTED'
}
