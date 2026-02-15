import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, isNull, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { CreateMealDto } from './dto/create-meal.dto';
import { MealFilterDto, UpdateMealDto } from './dto/meal-filter.dto';

@Injectable()
export class MealsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, data: CreateMealDto) {
    const [meal] = await this.db
      .insert(schema.meals)
      .values({
        userId,
        foodName: data.foodName,
        calories: data.calories?.toString(),
        carbs: data.carbs?.toString(),
        mealType: data.mealType,
        recordedAt: new Date(data.recordedAt),
        notes: data.notes,
      })
      .returning();
    return meal;
  }

  async findOne(id: string) {
    return this.db.query.meals.findFirst({
      where: and(eq(schema.meals.id, id), isNull(schema.meals.deletedAt)),
    });
  }

  async update(id: string, userId: string, data: UpdateMealDto) {
    const [updated] = await this.db
      .update(schema.meals)
      .set({
        ...(data.foodName ? { foodName: data.foodName } : {}),
        ...(data.calories ? { calories: data.calories.toString() } : {}),
        ...(data.carbs ? { carbs: data.carbs.toString() } : {}),
        ...(data.mealType ? { mealType: data.mealType } : {}),
        ...(data.recordedAt ? { recordedAt: new Date(data.recordedAt) } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      })
      .where(
        and(
          eq(schema.meals.id, id),
          eq(schema.meals.userId, userId),
          isNull(schema.meals.deletedAt),
        ),
      )
      .returning();
    return updated;
  }

  async softDelete(id: string, userId: string) {
    const [deleted] = await this.db
      .update(schema.meals)
      .set({ deletedAt: new Date() })
      .where(and(eq(schema.meals.id, id), eq(schema.meals.userId, userId)))
      .returning();
    return deleted;
  }

  async findAll(
    userId: string,
    query: MealFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.meals.$inferSelect>> {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      mealType,
      search,
    } = query;
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(schema.meals.userId, userId),
      isNull(schema.meals.deletedAt),
    ];

    if (startDate)
      baseConditions.push(gte(schema.meals.recordedAt, new Date(startDate)));
    if (endDate)
      baseConditions.push(lte(schema.meals.recordedAt, new Date(endDate)));
    if (mealType) baseConditions.push(eq(schema.meals.mealType, mealType));
    if (search)
      baseConditions.push(ilike(schema.meals.foodName, `%${search}%`));

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.meals)
      .where(and(...baseConditions));

    const data = await this.db.query.meals.findMany({
      where: and(...baseConditions),
      limit,
      offset,
      orderBy: [desc(schema.meals.recordedAt)],
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
