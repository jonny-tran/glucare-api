import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async getUsers(query: UserFilterDto) {
    return this.adminRepository.findAllUsers(query);
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.adminRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return this.adminRepository.updateUserStatus(id, dto.isActive);
  }

  async getPendingDoctors() {
    const list = await this.adminRepository.findPendingDoctors();
    return list.map((item) => ({
      ...item.doctor,
      user: {
        id: item.user.id,
        email: item.user.email,
        fullName: item.user.fullName,
        phoneNumber: item.user.phoneNumber,
        isActive: item.user.isActive,
      },
    }));
  }

  async verifyDoctor(doctorId: string) {
    const doctor = await this.adminRepository.findDoctorById(doctorId);
    if (!doctor) {
      throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ');
    }

    if (doctor.user && doctor.user.isActive) {
      return doctor.user; // Already active
    }

    return this.adminRepository.verifyDoctor(doctor.userId);
  }
}
