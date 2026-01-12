import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginAdminDto, LoginUserDto } from './dto/login.dto';
import { AtGuard } from './guards/auth.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/admin')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng nhập Admin thành công')
  async loginAdmin(@Body() dto: LoginAdminDto) {
    return this.authService.loginAdmin(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng nhập thành công')
  async loginUser(@Body() dto: LoginUserDto) {
    return this.authService.loginUser(dto);
  }

  @UseGuards(AtGuard)
  @Get('me')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
