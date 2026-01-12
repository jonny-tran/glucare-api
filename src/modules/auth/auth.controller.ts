import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { ApiGetProfile, ApiLoginAdmin, ApiLoginUser } from './auth.swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginAdminDto, LoginUserDto } from './dto/login.dto';
import { AtGuard } from './guards/auth.guard';

@ApiTags('Authentication')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/admin')
  @HttpCode(HttpStatus.OK)
  @ApiLoginAdmin()
  @ResponseMessage('Đăng nhập Admin thành công')
  async loginAdmin(@Body() dto: LoginAdminDto) {
    return this.authService.loginAdmin(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLoginUser()
  @ResponseMessage('Đăng nhập thành công')
  async loginUser(@Body() dto: LoginUserDto) {
    return this.authService.loginUser(dto);
  }

  @UseGuards(AtGuard)
  @Get('me')
  @ApiGetProfile()
  @ResponseMessage('Lấy thông tin người dùng thành công')
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
