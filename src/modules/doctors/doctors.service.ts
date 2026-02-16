import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionsRepository } from '../connections/connections.repository';
import { GlucoseRepository } from '../glucose/glucose.repository';
import { IGlucoseReading } from '../glucose/interfaces/glucose.interface';
import { GlucoseAnalyticsService } from '../glucose/services/glucose-analytics.service';
import { UsersRepository } from '../users/users.repository';
import { DoctorNotesRepository } from './doctor-notes.repository';
import { CreateNoteDto } from './dto/create-note.dto';

export interface IPatientOverview {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  lastGlucose: number | null;
  lastGlucoseTime: Date | null;
  tir7Days: number;
  dangerLevel: 'RED' | 'YELLOW' | 'GREEN' | 'GREY';
  dangerDetails: string;
}

// Partial Type to match Repository Result structure
// We can define minimal requirements.
interface IDoctorConnection {
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'CANCELLED';
  patient: {
    id: string;
    user: {
      id: string;
      fullName: string | null;
      email: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

@Injectable()
export class DoctorsService {
  constructor(
    private readonly connectionsRepo: ConnectionsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly glucoseRepo: GlucoseRepository,
    private readonly glucoseAnalytics: GlucoseAnalyticsService,
    private readonly doctorNotesRepo: DoctorNotesRepository,
  ) {}

  async getPatients(userId: string): Promise<IPatientOverview[]> {
    // 1. Get Doctor Profile
    const doctor = await this.usersRepo.findDoctorByUserId(userId);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // 2. Get Connected Patients (Active only)
    // Explicitly cast the result or assume repo returns compatible structure.
    // Since we don't have deeply inferred types exported from repo, we use unknown -> specific interface cast or assertion.
    const connections = (await this.connectionsRepo.findAllForDoctor(
      doctor.id,
    )) as unknown as IDoctorConnection[];

    const activeConnections = connections.filter((c) => c.status === 'ACTIVE');

    const result: IPatientOverview[] = [];

    // 3. Populate Dashboard Data
    for (const conn of activeConnections) {
      // Strict Null Checks
      if (!conn.patient || !conn.patient.user) continue;

      const patient = conn.patient;
      const patientUser = conn.patient.user; // Re-access through checked connection to ensure type safety
      if (!patientUser) continue;

      // A. Get Latest Glucose
      const latestReading = await this.glucoseRepo.findLatest(patientUser.id);

      // B. Calculate TIR (Last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const readings = await this.glucoseRepo.findByDateRange(
        patientUser.id,
        startDate,
        endDate,
      );

      // Map DB result to Interface
      // We perform explicit mapping to ensure runtime safety and type compliance
      const mappedReadings: IGlucoseReading[] = readings.map((r) => ({
        userId: r.userId,
        glucoseValue: r.glucoseValue,
        readingType: r.readingType,
        mealContext: r.mealContext,
        recordedAt: r.recordedAt,
        notes: r.notes || undefined, // Transform null to undefined if interface requires optional
        createdAt: r.createdAt || undefined,
      }));

      const { tir } = this.glucoseAnalytics.calculateTIR(mappedReadings);

      // C. Determine Status
      let status: 'RED' | 'YELLOW' | 'GREEN' | 'GREY' = 'GREY';
      let dangerLevelDetails = 'No Data';

      if (latestReading) {
        const val = parseFloat(latestReading.glucoseValue);

        if (val < 54 || val > 250) {
          status = 'RED';
          dangerLevelDetails =
            val < 54 ? 'Hypoglycemia Critical' : 'Hyperglycemia Critical';
        } else if (val < 70 || val > 180) {
          status = 'YELLOW';
          dangerLevelDetails = 'Out of Target';
        } else {
          status = 'GREEN';
          dangerLevelDetails = 'Stable';
        }
      }

      result.push({
        id: patient.id,
        fullName: patientUser.fullName,
        email: patientUser.email,
        avatarUrl: patientUser.avatarUrl,
        lastGlucose: latestReading
          ? parseFloat(latestReading.glucoseValue)
          : null,
        lastGlucoseTime: latestReading ? latestReading.recordedAt : null,
        tir7Days: tir,
        dangerLevel: status,
        dangerDetails: dangerLevelDetails,
      });
    }

    // Sort by Danger Level (Red (0) > Yellow (1) > Green (2) > Grey (3))
    return result.sort((a, b) => {
      const prioritize = { RED: 0, YELLOW: 1, GREEN: 2, GREY: 3 };
      return prioritize[a.dangerLevel] - prioritize[b.dangerLevel];
    });
  }

  // Doctor Notes Logic
  async createNote(
    doctorUserId: string,
    patientId: string,
    dto: CreateNoteDto,
  ) {
    const doctor = await this.usersRepo.findDoctorByUserId(doctorUserId);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // Verify Active Connection
    const connection = await this.connectionsRepo.findByPatientAndDoctor(
      patientId,
      doctor.id,
    );

    if (!connection || connection.status !== 'ACTIVE') {
      throw new NotFoundException(
        'Không thể tạo ghi chú. Bệnh nhân này không kết nối với bạn.',
      );
    }

    return this.doctorNotesRepo.create(doctor.id, patientId, dto.content);
  }

  async getNotes(doctorUserId: string, patientId: string) {
    const doctor = await this.usersRepo.findDoctorByUserId(doctorUserId);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    return this.doctorNotesRepo.findByPatient(patientId, doctor.id);
  }
}
