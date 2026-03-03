import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
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

  async findAllUsers(query: UserFilterDto) {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      includeDeleted,
    } = query;
    const offset = (page - 1) * limit;

    const baseConditions: SQL[] = [];

    // Filter by role
    if (role) {
      baseConditions.push(eq(schema.users.role, role));
    }

    // Filter by status
    if (status) {
      baseConditions.push(eq(schema.users.status, status));
    }

    // Search by name or email
    if (search) {
      baseConditions.push(
        or(
          ilike(schema.users.fullName, `%${search}%`),
          ilike(schema.users.email, `%${search}%`),
        )!,
      );
    }

    // Soft delete filter (exclude deleted users by default)
    if (!includeDeleted) {
      baseConditions.push(isNull(schema.users.deletedAt));
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
      columns: {
        password: false,
        hashedRefreshToken: false,
      },
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
      where: and(eq(schema.users.id, id), isNull(schema.users.deletedAt)),
      columns: {
        password: false,
        hashedRefreshToken: false,
      },
    });
  }

  async updateUserStatus(id: string, status: 'ACTIVE' | 'BLOCKED') {
    const [updated] = await this.db
      .update(schema.users)
      .set({
        status,
        // Clear refresh token when blocking to invalidate sessions
        ...(status === 'BLOCKED' ? { hashedRefreshToken: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        role: schema.users.role,
        status: schema.users.status,
        updatedAt: schema.users.updatedAt,
      });
    return updated;
  }

  async softDeleteUser(userId: string) {
    const [deleted] = await this.db
      .update(schema.users)
      .set({
        deletedAt: new Date(),
        hashedRefreshToken: null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.users.fullName,
        deletedAt: schema.users.deletedAt,
      });
    return deleted;
  }

  async findPendingDoctors(): Promise<
    {
      doctor: typeof schema.doctors.$inferSelect;
      user: Pick<
        typeof schema.users.$inferSelect,
        'id' | 'email' | 'fullName' | 'phoneNumber' | 'status'
      >;
    }[]
  > {
    return this.db
      .select({
        doctor: schema.doctors,
        user: {
          id: schema.users.id,
          email: schema.users.email,
          fullName: schema.users.fullName,
          phoneNumber: schema.users.phoneNumber,
          status: schema.users.status,
        },
      })
      .from(schema.doctors)
      .innerJoin(schema.users, eq(schema.doctors.userId, schema.users.id))
      .where(
        and(
          eq(schema.users.status, 'PENDING'),
          eq(schema.users.role, UserRole.DOCTOR),
          isNull(schema.users.deletedAt),
        ),
      );
  }

  async findDoctorById(id: string) {
    return this.db.query.doctors.findFirst({
      where: eq(schema.doctors.id, id),
      with: {
        user: {
          columns: {
            password: false,
            hashedRefreshToken: false,
          },
        },
      },
    });
  }

  async verifyDoctor(userId: string) {
    return this.db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(schema.users)
        .set({ status: 'ACTIVE', updatedAt: new Date() })
        .where(eq(schema.users.id, userId))
        .returning({
          id: schema.users.id,
          email: schema.users.email,
          fullName: schema.users.fullName,
          role: schema.users.role,
          status: schema.users.status,
        });
      return updatedUser;
    });
  }
}
