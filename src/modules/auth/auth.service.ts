import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthRepository } from './auth.repository';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { LoginAdminDto, LoginUserDto, RefreshTokenDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register.dto';
import { TokenService } from './helper/token.service';

@Injectable()
export class AuthService {
  constructor(
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

  async refreshTokens(dto: RefreshTokenDto) {
    const payload = await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

    const user = await this.authRepository.findById(payload.sub);

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn',
      );
    }

    const refreshTokenMatches = await argon2.verify(
      user.hashedRefreshToken,
      dto.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException(
        'Refresh Token không hợp lệ hoặc đã hết hạn',
      );
    }

    return this.tokenService.generateAuthResponse(user.id, user.role);
  }

  async logout(userId: string) {
    await this.authRepository.updateRefreshToken(userId, null);
  }

  async registerPatient(dto: RegisterPatientDto) {
    const existingUser = await this.authRepository.findUserByPhoneNumber(
      dto.phoneNumber,
    );

    if (existingUser) {
      throw new BadRequestException('Số điện thoại đã được đăng ký');
    }

    const hashedPassword = await argon2.hash(dto.password);

    const userData = {
      phoneNumber: dto.phoneNumber,
      password: hashedPassword,
      role: 'PATIENT' as const,
    };

    const patientData = {
      fullName: dto.fullName,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth.toISOString().split('T')[0],
    };

    const result = await this.authRepository.createPatient(
      userData,
      patientData,
    );

    return {
      id: result.user.id,
      phoneNumber: result.user.phoneNumber,
      role: result.user.role,
      fullName: result.patient.fullName,
    };
  }

  async createDoctor(dto: CreateDoctorDto) {
    const existingPhone = await this.authRepository.findUserByPhoneNumber(
      dto.phoneNumber,
    );

    if (existingPhone) {
      throw new BadRequestException('Số điện thoại đã được đăng ký');
    }

    const existingLicense = await this.authRepository.findDoctorByLicense(
      dto.licenseNumber,
    );

    if (existingLicense) {
      throw new BadRequestException('Số giấy phép hành nghề đã tồn tại');
    }

    const hashedPassword = await argon2.hash(dto.password);

    const userData = {
      phoneNumber: dto.phoneNumber,
      password: hashedPassword,
      role: 'DOCTOR' as const,
    };

    const doctorData = {
      fullName: dto.fullName,
      licenseNumber: dto.licenseNumber,
      specialization: dto.specialization,
      hospital: dto.hospital,
    };

    const result = await this.authRepository.createDoctor(userData, doctorData);

    return {
      id: result.user.id,
      phoneNumber: result.user.phoneNumber,
      role: result.user.role,
      fullName: result.doctor.fullName,
      licenseNumber: result.doctor.licenseNumber,
    };
  }
}
