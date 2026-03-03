import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExerciseFilterDto } from './dto/exercise-filter.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, data: CreateExerciseDto) {
    const [exercise] = await this.db
      .insert(schema.exercises)
      .values({
        userId,
        exerciseType: data.exerciseType,
        duration: data.duration,
        intensity: data.intensity,
        caloriesBurned: data.caloriesBurned?.toString(),
        startTime: new Date(data.startTime),
        notes: data.notes,
      })
      .returning();
    return exercise;
  }

  async findById(id: string) {
    return this.db.query.exercises.findFirst({
      where: and(
        eq(schema.exercises.id, id),
        isNull(schema.exercises.deletedAt),
      ),
    });
  }

  async findAll(
    userId: string,
    query: ExerciseFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.exercises.$inferSelect>> {
    const { page = 1, limit = 10, startDate, endDate, intensity } = query;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(schema.exercises.userId, userId),
      isNull(schema.exercises.deletedAt),
    ];

    if (startDate)
      conditions.push(gte(schema.exercises.startTime, new Date(startDate)));
    if (endDate)
      conditions.push(lte(schema.exercises.startTime, new Date(endDate)));
    if (intensity)
      conditions.push(
        eq(schema.exercises.intensity, intensity as 'LOW' | 'MEDIUM' | 'HIGH'),
      );

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.exercises)
      .where(and(...conditions));

    const data = await this.db.query.exercises.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(schema.exercises.startTime)],
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

  async update(id: string, data: UpdateExerciseDto) {
    const setData: Record<string, unknown> = {};
    if (data.exerciseType !== undefined)
      setData.exerciseType = data.exerciseType;
    if (data.duration !== undefined) setData.duration = data.duration;
    if (data.intensity !== undefined) setData.intensity = data.intensity;
    if (data.caloriesBurned !== undefined)
      setData.caloriesBurned = data.caloriesBurned.toString();
    if (data.startTime !== undefined)
      setData.startTime = new Date(data.startTime);
    if (data.notes !== undefined) setData.notes = data.notes;

    const [updated] = await this.db
      .update(schema.exercises)
      .set(setData)
      .where(
        and(eq(schema.exercises.id, id), isNull(schema.exercises.deletedAt)),
      )
      .returning();
    return updated;
  }

  async softDelete(id: string) {
    const [deleted] = await this.db
      .update(schema.exercises)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(schema.exercises.id, id), isNull(schema.exercises.deletedAt)),
      )
      .returning();
    return deleted;
  }
}
