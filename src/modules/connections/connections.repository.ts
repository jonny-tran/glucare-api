import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
}
