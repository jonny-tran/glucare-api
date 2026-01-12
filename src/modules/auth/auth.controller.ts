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
import {
  ApiCreateDoctor,
  ApiGetProfile,
  ApiLoginAdmin,
  ApiLoginUser,
  ApiLogout,
  ApiRefresh,
  ApiRegisterPatient,
} from './auth.swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { LoginAdminDto, LoginUserDto, RefreshTokenDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register.dto';
import { AtGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiRefresh()
  @ResponseMessage('Làm mới token thành công')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @UseGuards(AtGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiLogout()
  @ResponseMessage('Đăng xuất thành công')
  async logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register/patient')
  @HttpCode(HttpStatus.CREATED)
  @ApiRegisterPatient()
  @ResponseMessage('Đăng ký thành công')
  async registerPatient(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto);
  }

  @UseGuards(AtGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('register/doctor')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateDoctor()
  @ResponseMessage('Tạo tài khoản bác sĩ thành công')
  async createDoctor(@Body() dto: CreateDoctorDto) {
    return this.authService.createDoctor(dto);
  }
}
