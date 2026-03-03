import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConnectionsRepository } from '../connections/connections.repository';
import { UsersRepository } from '../users/users.repository';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

// Khoảng thời gian tối thiểu giữa 2 lịch hẹn (phút)
const OVERLAP_BUFFER_MINUTES = 30;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepo: AppointmentsRepository,
    private readonly connectionsRepo: ConnectionsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Patient tạo lịch hẹn mới.
   * Bước 1: Kiểm tra kết nối Patient-Doctor phải ACTIVE.
   * Bước 2: Kiểm tra chồng chéo lịch (Anti-overlap ±30 phút).
   * Bước 3: Tạo bản ghi và bắn event.
   */
  async create(userId: string, dto: CreateAppointmentDto) {
    // Validate: Thời gian phải ở tương lai
    const appointmentDate = new Date(dto.appointmentDate);
    if (appointmentDate <= new Date()) {
      throw new BadRequestException('Thời gian hẹn phải ở tương lai');
    }

    // Step 1: Kiểm tra kết nối Patient-Doctor (E-03)
    // Cần resolve: userId -> patientId, dto.doctorId -> doctorId
    const patient = await this.usersRepo.findPatientByUserId(userId);
    if (!patient) {
      throw new BadRequestException('Không tìm thấy hồ sơ bệnh nhân');
    }

    const connection = await this.connectionsRepo.findByPatientAndDoctor(
      patient.id,
      dto.doctorId,
    );
    if (!connection || connection.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Bạn phải kết nối với bác sĩ trước khi đặt lịch hẹn. Vui lòng gửi lời mời kết nối trước.',
      );
    }

    // Step 2: Anti-overlap check (±30 phút)
    const timeBufferMs = OVERLAP_BUFFER_MINUTES * 60 * 1000;
    const startWindow = new Date(appointmentDate.getTime() - timeBufferMs);
    const endWindow = new Date(appointmentDate.getTime() + timeBufferMs);

    const overlapping = await this.appointmentsRepo.findOverlapping(
      userId,
      startWindow,
      endWindow,
    );
    if (overlapping.length > 0) {
      throw new BadRequestException(
        'Bạn đã có lịch hẹn Pending/Confirmed trong khoảng ±30 phút. Vui lòng chọn thời gian khác.',
      );
    }

    // Step 3: Tạo appointment
    const appointment = await this.appointmentsRepo.create(userId, dto);

    // Step 4: Bắn event cho Notification Module
    this.eventEmitter.emit('appointment.created', { appointment });

    return appointment;
  }

  /**
   * Lấy danh sách lịch hẹn.
   * Patient: xem lịch theo userId.
   * Doctor: xem lịch theo doctorId (profile ID).
   */
  async findAll(
    userId: string,
    role: 'PATIENT' | 'DOCTOR',
    filter: AppointmentFilterDto,
  ) {
    if (role === 'DOCTOR') {
      // Doctor cần resolve userId -> doctorId (profile)
      const doctor = await this.usersRepo.findDoctorByUserId(userId);
      if (!doctor) {
        throw new BadRequestException('Không tìm thấy hồ sơ bác sĩ');
      }
      return this.appointmentsRepo.findAll(doctor.id, 'DOCTOR', filter);
    }

    // Patient: dùng userId trực tiếp
    return this.appointmentsRepo.findAll(userId, 'PATIENT', filter);
  }

  /**
   * Lấy chi tiết một lịch hẹn.
   */
  async findOne(id: string, userId: string, role: 'PATIENT' | 'DOCTOR') {
    const appointment = await this.appointmentsRepo.findById(id);
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy thông tin lịch hẹn');
    }

    // Kiểm tra quyền truy cập
    if (role === 'PATIENT' && appointment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem lịch hẹn này');
    }
    if (role === 'DOCTOR') {
      const doctor = await this.usersRepo.findDoctorByUserId(userId);
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('Bạn không có quyền xem lịch hẹn này');
      }
    }

    return appointment;
  }

  /**
   * Cập nhật trạng thái lịch hẹn (State Machine).
   *
   * Patient: Chỉ được hủy (CANCELLED).
   * Doctor: Được Confirm, Cancel, Complete.
   *
   * Luồng trạng thái hợp lệ:
   *   PENDING -> CONFIRMED | CANCELLED
   *   CONFIRMED -> COMPLETED | CANCELLED
   *   CANCELLED -> (không chuyển được)
   *   COMPLETED -> (không chuyển được)
   */
  async updateStatus(
    id: string,
    userId: string,
    role: 'PATIENT' | 'DOCTOR',
    dto: UpdateAppointmentStatusDto,
  ) {
    const appointment = await this.appointmentsRepo.findById(id);
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy thông tin lịch hẹn');
    }

    // Validate state transition
    this.validateStateTransition(appointment.status, dto.status);

    // Authorization logic theo role
    if (role === 'PATIENT') {
      if (appointment.userId !== userId) {
        throw new ForbiddenException('Truy cập bị từ chối');
      }
      // Bệnh nhân chỉ được hủy
      if (dto.status !== 'CANCELLED') {
        throw new ForbiddenException(
          'Bệnh nhân chỉ có quyền hủy lịch hẹn (CANCELLED)',
        );
      }
    } else if (role === 'DOCTOR') {
      const doctor = await this.usersRepo.findDoctorByUserId(userId);
      if (!doctor || appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('Truy cập bị từ chối');
      }
      // Doctor có thể CONFIRMED, CANCELLED, COMPLETED
    }

    const updated = await this.appointmentsRepo.updateStatus(
      id,
      dto.status,
      dto.reason,
    );

    // Bắn event cho Notification Module
    if (dto.status === 'CONFIRMED') {
      this.eventEmitter.emit('appointment.confirmed', {
        appointment: updated,
      });
    } else if (dto.status === 'CANCELLED') {
      this.eventEmitter.emit('appointment.cancelled', {
        appointment: updated,
        cancelledBy: role,
      });
    } else if (dto.status === 'COMPLETED') {
      this.eventEmitter.emit('appointment.completed', {
        appointment: updated,
      });
    }

    return updated;
  }

  /**
   * Validate chuyển trạng thái hợp lệ (State Machine).
   * PENDING -> CONFIRMED | CANCELLED
   * CONFIRMED -> COMPLETED | CANCELLED
   * CANCELLED / COMPLETED -> không cho chuyển nữa
   */
  private validateStateTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      CANCELLED: [],
      COMPLETED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${currentStatus} sang ${newStatus}`,
      );
    }
  }
}
