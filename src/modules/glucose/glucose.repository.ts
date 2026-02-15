import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { CreateGlucoseDto } from './dto/create-glucose.dto';
import { GlucoseFilterDto, UpdateGlucoseDto } from './dto/glucose-filter.dto';

@Injectable()
export class GlucoseRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, data: CreateGlucoseDto) {
    const [reading] = await this.db
      .insert(schema.glucoseReadings)
      .values({
        userId,
        glucoseValue: data.glucoseValue.toString(),
        readingType: data.readingType,
        mealContext: data.mealContext,
        recordedAt: new Date(data.recordedAt),
        notes: data.notes,
        medicationId: data.medicationId,
        mealId: data.mealId,
      })
      .returning();
    return reading;
  }

  async findOne(id: string) {
    return this.db.query.glucoseReadings.findFirst({
      where: and(
        eq(schema.glucoseReadings.id, id),
        isNull(schema.glucoseReadings.deletedAt),
      ),
    });
  }

  async update(id: string, userId: string, data: UpdateGlucoseDto) {
    const [updated] = await this.db
      .update(schema.glucoseReadings)
      .set({
        ...(data.glucoseValue
          ? { glucoseValue: data.glucoseValue.toString() }
          : {}),
        ...(data.notes ? { notes: data.notes } : {}),
        ...(data.mealContext ? { mealContext: data.mealContext } : {}),
        ...(data.medicationId ? { medicationId: data.medicationId } : {}),
        ...(data.mealId ? { mealId: data.mealId } : {}),
      })
      .where(
        and(
          eq(schema.glucoseReadings.id, id),
          eq(schema.glucoseReadings.userId, userId),
          isNull(schema.glucoseReadings.deletedAt),
        ),
      )
      .returning();
    return updated;
  }

  async softDelete(id: string, userId: string) {
    const [deleted] = await this.db
      .update(schema.glucoseReadings)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(schema.glucoseReadings.id, id),
          eq(schema.glucoseReadings.userId, userId),
        ),
      )
      .returning();
    return deleted;
  }

  async findAll(
    userId: string,
    query: GlucoseFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.glucoseReadings.$inferSelect>> {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      mealContext,
      readingType,
      minVal,
      maxVal,
    } = query;
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(schema.glucoseReadings.userId, userId),
      isNull(schema.glucoseReadings.deletedAt),
    ];

    if (startDate)
      baseConditions.push(
        gte(schema.glucoseReadings.recordedAt, new Date(startDate)),
      );
    if (endDate)
      baseConditions.push(
        lte(schema.glucoseReadings.recordedAt, new Date(endDate)),
      );
    if (mealContext)
      baseConditions.push(eq(schema.glucoseReadings.mealContext, mealContext));
    if (readingType)
      baseConditions.push(eq(schema.glucoseReadings.readingType, readingType));
    if (minVal)
      baseConditions.push(
        gte(schema.glucoseReadings.glucoseValue, minVal.toString()),
      );
    if (maxVal)
      baseConditions.push(
        lte(schema.glucoseReadings.glucoseValue, maxVal.toString()),
      );

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.glucoseReadings)
      .where(and(...baseConditions));

    const data = await this.db.query.glucoseReadings.findMany({
      where: and(...baseConditions),
      limit,
      offset,
      orderBy: [desc(schema.glucoseReadings.recordedAt)],
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

  async findLatest(userId: string) {
    return this.db.query.glucoseReadings.findFirst({
      where: and(
        eq(schema.glucoseReadings.userId, userId),
        isNull(schema.glucoseReadings.deletedAt),
      ),
      orderBy: [desc(schema.glucoseReadings.recordedAt)],
    });
  }

  async findLatestN(userId: string, n: number) {
    return this.db.query.glucoseReadings.findMany({
      where: and(
        eq(schema.glucoseReadings.userId, userId),
        isNull(schema.glucoseReadings.deletedAt),
      ),
      orderBy: [desc(schema.glucoseReadings.recordedAt)],
      limit: n,
    });
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date) {
    return this.db.query.glucoseReadings.findMany({
      where: and(
        eq(schema.glucoseReadings.userId, userId),
        gte(schema.glucoseReadings.recordedAt, startDate),
        lte(schema.glucoseReadings.recordedAt, endDate),
        isNull(schema.glucoseReadings.deletedAt),
      ),
      orderBy: [desc(schema.glucoseReadings.recordedAt)],
    });
  }

  async calculateAverage(userId: string, startDate: Date, endDate: Date) {
    const [result] = await this.db
      .select({
        average: sql<string>`avg(${schema.glucoseReadings.glucoseValue})`,
      })
      .from(schema.glucoseReadings)
      .where(
        and(
          eq(schema.glucoseReadings.userId, userId),
          gte(schema.glucoseReadings.recordedAt, startDate),
          lte(schema.glucoseReadings.recordedAt, endDate),
          isNull(schema.glucoseReadings.deletedAt),
        ),
      );
    return result?.average ? parseFloat(result.average) : null;
  }

  async countReadings(userId: string, startDate: Date, endDate: Date) {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.glucoseReadings)
      .where(
        and(
          eq(schema.glucoseReadings.userId, userId),
          gte(schema.glucoseReadings.recordedAt, startDate),
          lte(schema.glucoseReadings.recordedAt, endDate),
          isNull(schema.glucoseReadings.deletedAt),
        ),
      );
    return result.count;
  }

  async calculateTodayAverage(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.calculateAverage(userId, today, tomorrow);
  }
}
