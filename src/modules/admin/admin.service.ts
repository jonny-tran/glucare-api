import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async getUsers(query: UserFilterDto) {
    return this.adminRepository.findAllUsers(query);
  }

  async updateUserStatus(
    adminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    // Không cho phép Admin tự block chính mình
    if (adminId === userId && dto.status === 'BLOCKED') {
      throw new BadRequestException(
        'Không thể tự khóa tài khoản của chính mình',
      );
    }

    const user = await this.adminRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Không cho phép block Admin khác
    if (user.role === 'ADMIN' && dto.status === 'BLOCKED') {
      throw new BadRequestException('Không thể khóa tài khoản Admin khác');
    }

    return this.adminRepository.updateUserStatus(userId, dto.status);
  }

  async softDeleteUser(adminId: string, userId: string) {
    // Không cho phép Admin tự xóa chính mình
    if (adminId === userId) {
      throw new BadRequestException('Không thể xóa tài khoản của chính mình');
    }

    const user = await this.adminRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Không cho phép xóa Admin
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Không thể xóa tài khoản Admin');
    }

    const deleted = await this.adminRepository.softDeleteUser(userId);
    if (!deleted) {
      throw new NotFoundException('Người dùng đã bị xóa trước đó');
    }

    return deleted;
  }

  async getPendingDoctors() {
    const list = await this.adminRepository.findPendingDoctors();
    return list.map((item) => ({
      ...item.doctor,
      user: item.user,
    }));
  }

  async verifyDoctor(doctorId: string) {
    const doctor = await this.adminRepository.findDoctorById(doctorId);
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ');
    }

    if (doctor.user && doctor.user.status === 'ACTIVE') {
      throw new BadRequestException('Bác sĩ này đã được duyệt trước đó');
    }

    return this.adminRepository.verifyDoctor(doctor.userId);
  }
}
