import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { UserRole } from 'src/database/schema';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class AdminRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAllUsers(
    query: UserFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.users.$inferSelect>> {
    const { page = 1, limit = 10, role, isActive } = query;
    const offset = (page - 1) * limit;

    const baseConditions: SQL[] = [];
    if (role) {
      baseConditions.push(eq(schema.users.role, role));
    }
    if (isActive !== undefined) {
      baseConditions.push(eq(schema.users.isActive, isActive));
    }

    const whereClause =
      baseConditions.length > 0 ? and(...baseConditions) : undefined;

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(whereClause);

    const data = await this.db.query.users.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(schema.users.createdAt)],
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

  async findUserById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });
  }

  async updateUserStatus(id: string, isActive: boolean) {
    const [updated] = await this.db
      .update(schema.users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  async findPendingDoctors(): Promise<
    {
      doctor: typeof schema.doctors.$inferSelect;
      user: typeof schema.users.$inferSelect;
    }[]
  > {
    return this.db
      .select({
        doctor: schema.doctors,
        user: schema.users,
      })
      .from(schema.doctors)
      .innerJoin(schema.users, eq(schema.doctors.userId, schema.users.id))
      .where(
        and(
          eq(schema.users.isActive, false),
          eq(schema.users.role, UserRole.DOCTOR),
        ),
      );
  }

  async findDoctorById(id: string) {
    return this.db.query.doctors.findFirst({
      where: eq(schema.doctors.id, id),
      with: {
        user: true,
      },
    });
  }

  async verifyDoctor(userId: string) {
    return this.db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(schema.users)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(schema.users.id, userId))
        .returning();
      return updatedUser;
    });
  }
}
