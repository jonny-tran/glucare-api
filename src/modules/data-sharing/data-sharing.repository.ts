import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class DataSharingRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createDefault(patientId: string, doctorId: string) {
    const [record] = await this.db
      .insert(schema.dataSharing)
      .values({
        patientId,
        doctorId,
        isActive: false,
        permissions: [],
      })
      .returning();
    return record;
  }

  async findByPatientAndDoctor(patientId: string, doctorId: string) {
    return this.db.query.dataSharing.findFirst({
      where: and(
        eq(schema.dataSharing.patientId, patientId),
        eq(schema.dataSharing.doctorId, doctorId),
      ),
    });
  }

  async findByDoctorId(doctorId: string) {
    return this.db.query.dataSharing.findMany({
      where: eq(schema.dataSharing.doctorId, doctorId),
    });
  }

  async updatePermissions(
    patientId: string,
    doctorId: string,
    permissions: string[],
  ) {
    // We update by patient+doctor composite key logicaly, but better if we have ID.
    // The service will look it up first, or we do query.
    // Let's stick to update by ID if passed, or patient+doctor.
    // Schema doesn't enforce unique constraint in code but logic requires one per pair.
    // Using Patient+Doctor is safer for this input.
    const [updated] = await this.db
      .update(schema.dataSharing)
      .set({ permissions })
      .where(
        and(
          eq(schema.dataSharing.patientId, patientId),
          eq(schema.dataSharing.doctorId, doctorId),
        ),
      )
      .returning();
    return updated;
  }

  async updateStatus(patientId: string, doctorId: string, isActive: boolean) {
    const [updated] = await this.db
      .update(schema.dataSharing)
      .set({ isActive })
      .where(
        and(
          eq(schema.dataSharing.patientId, patientId),
          eq(schema.dataSharing.doctorId, doctorId),
        ),
      )
      .returning();
    return updated;
  }
}
