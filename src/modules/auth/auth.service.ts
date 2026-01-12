import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { AuthRepository } from './auth.repository';
import { LoginAdminDto, LoginUserDto } from './dto/login.dto';
import { TokenService } from './helper/token.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
  ) {}

  async loginAdmin(dto: LoginAdminDto) {
    const user = await this.authRepository.findAdminByEmail(dto.email);
    if (!user) throw new BadRequestException('Tài khoản Admin không tồn tại');

    const passwordMatches = await argon2.verify(user.password, dto.password);
    if (!passwordMatches)
      throw new UnauthorizedException('Mật khẩu không đúng');

    return this.tokenService.generateAuthResponse(user.id, user.role);
  }

  async loginUser(dto: LoginUserDto) {
    const user = await this.authRepository.findUserByPhoneNumber(
      dto.phoneNumber,
    );

    if (!user) throw new BadRequestException('Số điện thoại chưa được đăng ký');

    if (user.role === 'ADMIN')
      throw new ForbiddenException('Vui lòng đăng nhập tại trang Admin');

    const passwordMatches = await argon2.verify(user.password, dto.password);
    if (!passwordMatches)
      throw new UnauthorizedException('Mật khẩu không đúng');

    return this.tokenService.generateAuthResponse(user.id, user.role);
  }

  async getProfile(userId: string) {
    const user = await this.authRepository.findUserWithProfile(userId);

    if (!user) throw new BadRequestException('User not found');

    const { patient, doctor, ...userInfo } = user || {};
    let profile: typeof patient | typeof doctor | null = null;
    if (user?.role === 'PATIENT' && patient) {
      profile = patient;
    } else if (user?.role === 'DOCTOR' && doctor) {
      profile = doctor;
    }

    return {
      ...userInfo,
      profile,
    };
  }
}
