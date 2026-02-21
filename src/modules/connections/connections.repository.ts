import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ConnectionsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(patientId: string, doctorId: string) {
    const [record] = await this.db
      .insert(schema.patientDoctors)
      .values({
        patientId,
        doctorId,
        status: 'PENDING',
      })
      .returning();
    return record;
  }

  async findById(id: string) {
    return this.db.query.patientDoctors.findFirst({
      where: eq(schema.patientDoctors.id, id),
      with: {
        patient: { with: { user: true } }, // Include patient user data
        doctor: { with: { user: true } }, // Include doctor user data
      },
    });
  }

  async findByPatientAndDoctor(patientId: string, doctorId: string) {
    return this.db.query.patientDoctors.findFirst({
      where: and(
        eq(schema.patientDoctors.patientId, patientId),
        eq(schema.patientDoctors.doctorId, doctorId),
      ),
    });
  }

  async updateStatus(
    id: string,
    status: 'ACTIVE' | 'REJECTED' | 'CANCELLED' | 'PENDING', // Added PENDING for reset
  ) {
    const [record] = await this.db
      .update(schema.patientDoctors)
      .set({ status })
      .where(eq(schema.patientDoctors.id, id))
      .returning();
    return record;
  }

  async findAllForPatient(patientId: string) {
    return this.db.query.patientDoctors.findMany({
      where: eq(schema.patientDoctors.patientId, patientId),
      with: {
        doctor: { with: { user: true } },
      },
    });
  }

  async findAllForDoctor(doctorId: string) {
    return this.db.query.patientDoctors.findMany({
      where: eq(schema.patientDoctors.doctorId, doctorId),
      with: {
        patient: { with: { user: true } },
      },
      // You may want to filter strictly active connection
      // But usually doctor wants to see pending requests too.
    });
  }

  async findPatientsWithOverview(doctorId: string, dangerLevel?: string) {
    const query = sql`
      WITH LatestReading AS (
        SELECT DISTINCT ON (user_id) 
               user_id, 
               glucose_value, 
               recorded_at,
               CASE 
                 WHEN glucose_value < 54 OR glucose_value > 250 THEN 'RED'
                 WHEN glucose_value < 70 OR glucose_value > 180 THEN 'YELLOW'
                 ELSE 'GREEN'
               END as danger_level
        FROM glucose_readings
        ORDER BY user_id, recorded_at DESC
      )
      SELECT 
        p.id as "patientId",
        u.id as "userId",
        u.full_name as "fullName",
        u.email as "email",
        u.avatar_url as "avatarUrl",
        lr.glucose_value as "lastGlucose",
        lr.recorded_at as "lastGlucoseTime",
        COALESCE(lr.danger_level, 'GREY') as "dangerLevel"
      FROM patient_doctors pd
      JOIN patients p ON pd.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      LEFT JOIN LatestReading lr ON u.id = lr.user_id
      WHERE pd.doctor_id = ${doctorId} AND pd.status = 'ACTIVE'
      ${dangerLevel ? sql`AND COALESCE(lr.danger_level, 'GREY') = ${dangerLevel}` : sql``}
    `;

    const res = await this.db.execute(query);
    return res.rows;
  }
}
