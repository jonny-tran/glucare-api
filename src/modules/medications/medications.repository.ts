import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, isNull, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { CreateMedicationDto } from './dto/create-medication.dto';
import {
  MedicationFilterDto,
  UpdateMedicationDto,
} from './dto/medication-filter.dto';

@Injectable()
export class MedicationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, data: CreateMedicationDto) {
    const [medication] = await this.db
      .insert(schema.medications)
      .values({
        userId,
        medicineName: data.medicineName,
        dosage: data.dosage?.toString(),
        unit: data.unit,
        recordedAt: new Date(data.recordedAt),
        notes: data.notes,
      })
      .returning();
    return medication;
  }

  async findOne(id: string) {
    return this.db.query.medications.findFirst({
      where: and(
        eq(schema.medications.id, id),
        isNull(schema.medications.deletedAt),
      ),
    });
  }

  async update(id: string, userId: string, data: UpdateMedicationDto) {
    const [updated] = await this.db
      .update(schema.medications)
      .set({
        ...(data.medicineName ? { medicineName: data.medicineName } : {}),
        ...(data.dosage ? { dosage: data.dosage.toString() } : {}),
        ...(data.unit ? { unit: data.unit } : {}),
        ...(data.recordedAt ? { recordedAt: new Date(data.recordedAt) } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      })
      .where(
        and(
          eq(schema.medications.id, id),
          eq(schema.medications.userId, userId),
          isNull(schema.medications.deletedAt),
        ),
      )
      .returning();
    return updated;
  }

  async softDelete(id: string, userId: string) {
    const [deleted] = await this.db
      .update(schema.medications)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(schema.medications.id, id),
          eq(schema.medications.userId, userId),
        ),
      )
      .returning();
    return deleted;
  }

  async findAll(
    userId: string,
    query: MedicationFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.medications.$inferSelect>> {
    const { page = 1, limit = 10, startDate, endDate, medicineName } = query;
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(schema.medications.userId, userId),
      isNull(schema.medications.deletedAt),
    ];

    if (startDate)
      baseConditions.push(
        gte(schema.medications.recordedAt, new Date(startDate)),
      );
    if (endDate)
      baseConditions.push(
        lte(schema.medications.recordedAt, new Date(endDate)),
      );
    if (medicineName)
      baseConditions.push(
        ilike(schema.medications.medicineName, `%${medicineName}%`),
      );

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.medications)
      .where(and(...baseConditions));

    const data = await this.db.query.medications.findMany({
      where: and(...baseConditions),
      limit,
      offset,
      orderBy: [desc(schema.medications.recordedAt)],
    });

    return {
      data,
      meta: {
        total: totalRecord.count,
        page,
        limit,
        lastPage: Math.ceil(totalRecord.count / limit),
      },
    };
  }
}
