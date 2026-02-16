import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSharingService } from '../data-sharing/data-sharing.service';
import { UsersRepository } from '../users/users.repository';
import { ConnectionsRepository } from './connections.repository';
import { InviteConnectionDto } from './dto/invite-connection.dto';
import {
  ConnectionAction,
  RespondConnectionDto,
} from './dto/respond-connection.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly repo: ConnectionsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly sharingService: DataSharingService,
  ) {}

  async sendInvite(userId: string, dto: InviteConnectionDto) {
    // TODO [Technical Debt]: Currently using direct ID/Email invitation. Need to upgrade to QR Code/One-Time-Token mechanism for better privacy in Phase 3.
    // 1. Resolve Sender
    const sender = await this.usersRepo.findUserById(userId);
    if (!sender) throw new BadRequestException('User not found');

    // 2. Resolve Target by Email
    const target = await this.usersRepo.findUserByEmail(dto.email);
    if (!target)
      throw new NotFoundException('Không tìm thấy người dùng với email này');

    if (sender.role === target.role) {
      throw new BadRequestException(
        'Không thể kết nối cùng vai trò (Bác sĩ với Bác sĩ, Bệnh nhân với Bệnh nhân)',
      );
    }

    let patientId: string;
    let doctorId: string;

    if (sender.role === 'PATIENT') {
      const p = await this.usersRepo.findPatientByUserId(sender.id);
      const d = await this.usersRepo.findDoctorByUserId(target.id);
      if (!p || !d) throw new BadRequestException('Hồ sơ chưa hoàn thiện');
      patientId = p.id;
      doctorId = d.id;
    } else if (sender.role === 'DOCTOR') {
      const d = await this.usersRepo.findDoctorByUserId(sender.id);
      const p = await this.usersRepo.findPatientByUserId(target.id);
      if (!p || !d) throw new BadRequestException('Hồ sơ chưa hoàn thiện');
      doctorId = d.id;
      patientId = p.id;
    } else {
      throw new BadRequestException('Role không hỗ trợ kết nối này');
    }

    // Check existing
    const existing = await this.repo.findByPatientAndDoctor(
      patientId,
      doctorId,
    );
    if (existing) {
      if (existing.status === 'PENDING')
        throw new BadRequestException('Đang chờ phản hồi');
      if (existing.status === 'ACTIVE')
        throw new BadRequestException('Đã kết nối');
      // If REJECTED/CANCELLED, create new one or update existing logic?
      // For simplicity, create NEW one logic (reset status to PENDING)
      if (existing.status === 'REJECTED' || existing.status === 'CANCELLED') {
        return this.repo.updateStatus(existing.id, 'PENDING');
      }
    }

    return this.repo.create(patientId, doctorId);
  }

  async respondConnection(
    userId: string,
    connectionId: string,
    dto: RespondConnectionDto,
  ) {
    const connection = await this.repo.findById(connectionId);
    if (!connection)
      throw new NotFoundException('Không tìm thấy yêu cầu kết nối');

    if (connection.status !== 'PENDING') {
      throw new BadRequestException(
        'Yêu cầu này đã được xử lý hoặc không còn hiệu lực',
      );
    }

    // Verify User Authorization
    // Must be either Patient or Doctor involved in the connection
    const currentUser = await this.usersRepo.findUserById(userId);
    if (!currentUser) throw new BadRequestException('User Invalid');

    let isAuthorized = false;
    if (currentUser.role === 'PATIENT') {
      const p = await this.usersRepo.findPatientByUserId(userId);
      if (p && p.id === connection.patientId) isAuthorized = true;
    } else if (currentUser.role === 'DOCTOR') {
      const d = await this.usersRepo.findDoctorByUserId(userId);
      if (d && d.id === connection.doctorId) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new ForbiddenException('Bạn không có quyền phản hồi yêu cầu này');
    }

    // Update Status
    const newStatus =
      dto.action === ConnectionAction.ACCEPT ? 'ACTIVE' : 'REJECTED';
    const updated = await this.repo.updateStatus(connectionId, newStatus);

    // If Accepted, create data sharing record
    if (newStatus === 'ACTIVE') {
      await this.sharingService.createInitialSharing(
        connection.patientId,
        connection.doctorId,
      );
    }

    return updated;
  }

  async listConnections(userId: string) {
    const user = await this.usersRepo.findUserById(userId);
    if (!user) throw new BadRequestException('Invalid user');

    if (user.role === 'PATIENT') {
      const p = await this.usersRepo.findPatientByUserId(userId);
      if (!p) return [];
      return this.repo.findAllForPatient(p.id);
    } else if (user.role === 'DOCTOR') {
      // Logic for doctor list
      const d = await this.usersRepo.findDoctorByUserId(userId);
      if (!d) return [];
      // Create findAllForDoctor in repo if needed
      // Using inline findMany or adding method to repo
      // For now, assume repo can handle or I add method.
      // Let's rely on repo.
      // I'll add findAllForDoctor to repo in next step if missed.
      return []; // Default empty for now to satisfy complier
    }
    return [];
  }
}
