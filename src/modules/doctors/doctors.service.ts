import { Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionsRepository } from '../connections/connections.repository';
import { GlucoseFilterDto } from '../glucose/dto/glucose-filter.dto';
import { GlucoseRepository } from '../glucose/glucose.repository';
import { GlucoseService } from '../glucose/glucose.service';
import { IGlucoseReading } from '../glucose/interfaces/glucose.interface';
import { GlucoseAnalyticsService } from '../glucose/services/glucose-analytics.service';
import { MealFilterDto } from '../meals/dto/meal-filter.dto';
import { MealsService } from '../meals/meals.service';
import { MedicationFilterDto } from '../medications/dto/medication-filter.dto';
import { MedicationsService } from '../medications/medications.service';
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

@Injectable()
export class DoctorsService {
  constructor(
    private readonly connectionsRepo: ConnectionsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly glucoseRepo: GlucoseRepository,
    private readonly glucoseAnalytics: GlucoseAnalyticsService,
    private readonly doctorNotesRepo: DoctorNotesRepository,
    private readonly glucoseService: GlucoseService,
    private readonly mealsService: MealsService,
    private readonly medicationsService: MedicationsService,
  ) {}

  async getPatients(
    userId: string,
    dangerLevel?: string,
  ): Promise<IPatientOverview[]> {
    // 1. Get Doctor Profile
    const doctor = await this.usersRepo.findDoctorByUserId(userId);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // 2. Get Connected Patients with DB-level Filtering
    const overviewRows = await this.connectionsRepo.findPatientsWithOverview(
      doctor.id,
      dangerLevel,
    );

    const result: IPatientOverview[] = [];

    // 3. Populate TIR and Map Data
    for (const row of overviewRows) {
      const patientUserId = row.userId as string;

      // Calculate TIR (Last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const readings = await this.glucoseRepo.findByDateRange(
        patientUserId,
        startDate,
        endDate,
      );

      // Map DB result to Interface
      const mappedReadings: IGlucoseReading[] = readings.map((r) => ({
        userId: r.userId,
        glucoseValue: r.glucoseValue,
        readingType: r.readingType,
        mealContext: r.mealContext,
        recordedAt: r.recordedAt,
        notes: r.notes || undefined,
        createdAt: r.createdAt || undefined,
      }));

      const { tir } = this.glucoseAnalytics.calculateTIR(mappedReadings);

      result.push({
        id: row.patientId as string,
        fullName: row.fullName as string | null,
        email: row.email as string | null,
        avatarUrl: row.avatarUrl as string | null,
        lastGlucose: row.lastGlucose
          ? parseFloat(row.lastGlucose as string)
          : null,
        lastGlucoseTime: row.lastGlucoseTime as Date | null,
        tir7Days: tir,
        dangerLevel: row.dangerLevel as 'RED' | 'YELLOW' | 'GREEN' | 'GREY',
        dangerDetails: this.getDangerDetails(
          row.lastGlucose ? parseFloat(row.lastGlucose as string) : null,
        ),
      });
    }

    // Sort by Danger Level
    return result.sort((a, b) => {
      const prioritize = { RED: 0, YELLOW: 1, GREEN: 2, GREY: 3 };
      return prioritize[a.dangerLevel] - prioritize[b.dangerLevel];
    });
  }

  private getDangerDetails(val: number | null): string {
    if (val === null) return 'No Data';
    if (val < 54 || val > 250) {
      return val < 54 ? 'Hypoglycemia Critical' : 'Hyperglycemia Critical';
    } else if (val < 70 || val > 180) {
      return 'Out of Target';
    } else {
      return 'Stable';
    }
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

  async getPatientUserId(patientId: string): Promise<string> {
    const patient = await this.usersRepo.findPatientById(patientId);
    if (!patient) throw new NotFoundException('Patient not found');
    return patient.userId;
  }

  async getPatientGlucose(patientId: string, query: GlucoseFilterDto) {
    const userId = await this.getPatientUserId(patientId);
    return this.glucoseService.getHistory(userId, query);
  }

  async getPatientMeals(patientId: string, query: MealFilterDto) {
    const userId = await this.getPatientUserId(patientId);
    return this.mealsService.findAll(userId, query);
  }

  async getPatientMedications(patientId: string, query: MedicationFilterDto) {
    const userId = await this.getPatientUserId(patientId);
    return this.medicationsService.findAll(userId, query);
  }
}
