import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class DoctorNotesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(doctorId: string, patientId: string, content: string) {
    const [note] = await this.db
      .insert(schema.doctorNotes)
      .values({
        doctorId,
        patientId,
        content,
      })
      .returning();
    return note;
  }

  async findByPatient(patientId: string, doctorId: string) {
    return this.db.query.doctorNotes.findMany({
      where: and(
        eq(schema.doctorNotes.patientId, patientId),
        eq(schema.doctorNotes.doctorId, doctorId),
      ),
      orderBy: [desc(schema.doctorNotes.createdAt)], // Recent first
    });
  }
}
