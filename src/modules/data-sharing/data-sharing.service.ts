import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { DataSharingRepository } from './data-sharing.repository';
import { ToggleSharingDto } from './dto/toggle-sharing.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@Injectable()
export class DataSharingService {
  constructor(
    private readonly repo: DataSharingRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  // Triggered when connection is accepted
  async createInitialSharing(patientId: string, doctorId: string) {
    // Check if exists first
    const existing = await this.repo.findByPatientAndDoctor(
      patientId,
      doctorId,
    );
    if (existing) return existing;

    return this.repo.createDefault(patientId, doctorId);
  }

  // Get settings for a specific doctor
  async getSettings(userId: string, targetDoctorId: string) {
    const patient = await this.usersRepo.findPatientByUserId(userId);
    if (!patient) throw new BadRequestException('User không phải là Patient');

    const settings = await this.repo.findByPatientAndDoctor(
      patient.id,
      targetDoctorId,
    );
    if (!settings) {
      // If no settings exist yet, maybe they are connected but data sharing record missing?
      // Should return default or 404.
      // Or auto-create if connection exists?
      // For now, return 404.
      throw new NotFoundException('Chưa có thiết lập chia sẻ với bác sĩ này');
    }
    return settings;
  }

  // Update permissions
  async updatePermissions(userId: string, dto: UpdatePermissionsDto) {
    const patient = await this.usersRepo.findPatientByUserId(userId);
    if (!patient) throw new BadRequestException('User không phải là Patient');

    const settings = await this.repo.findByPatientAndDoctor(
      patient.id,
      dto.doctorId,
    );
    if (!settings)
      throw new NotFoundException('Không tìm thấy thiết lập chia sẻ');

    // Convert existing array to set for easier manipulation
    const currentPermissions = new Set(settings.permissions || []);

    // Apply updates
    if (dto.viewGlucose !== undefined) {
      if (dto.viewGlucose) currentPermissions.add('VIEW_GLUCOSE');
      else currentPermissions.delete('VIEW_GLUCOSE');
    }
    if (dto.viewMeals !== undefined) {
      if (dto.viewMeals) currentPermissions.add('VIEW_MEALS');
      else currentPermissions.delete('VIEW_MEALS');
    }
    if (dto.viewMedications !== undefined) {
      if (dto.viewMedications) currentPermissions.add('VIEW_MEDICATIONS');
      else currentPermissions.delete('VIEW_MEDICATIONS');
    }

    return this.repo.updatePermissions(
      patient.id,
      dto.doctorId,
      Array.from(currentPermissions),
    );
  }

  // Toggle Sharing
  async toggleSharing(userId: string, dto: ToggleSharingDto) {
    const patient = await this.usersRepo.findPatientByUserId(userId);
    if (!patient) throw new BadRequestException('User không phải là Patient');

    const settings = await this.repo.findByPatientAndDoctor(
      patient.id,
      dto.doctorId,
    );
    if (!settings)
      throw new NotFoundException('Không tìm thấy thiết lập chia sẻ');

    return this.repo.updateStatus(patient.id, dto.doctorId, dto.isActive);
  }

  // Security Check (Used by Guard)
  async checkAccess(
    doctorUserId: string,
    patientId: string, // Resource owner's Patient ID
    requiredPermission?: string,
  ): Promise<boolean> {
    const doctor = await this.usersRepo.findDoctorByUserId(doctorUserId);
    if (!doctor) return false; // Not a doctor

    const settings = await this.repo.findByPatientAndDoctor(
      patientId,
      doctor.id,
    );

    if (!settings) return false; // No connection/sharing record
    if (!settings.isActive) return false; // Sharing is disabled

    // Security Core Upgrade: Time-Bound Logic
    const now = new Date();
    // Normalize time part for accurate date comparison if needed, but Date object comparison includes time.
    // Assuming startDate/endDate are Date objects from ORM.

    if (settings.startDate) {
      const start = new Date(settings.startDate);
      if (now < start) return false;
    }

    if (settings.endDate) {
      const end = new Date(settings.endDate);
      if (now > end) return false;
    }

    if (requiredPermission) {
      // Check if permission is in the array
      // permissions is string[] | null
      const perms = settings.permissions || [];
      if (!perms.includes(requiredPermission)) return false;
    }

    return true;
  }
}
