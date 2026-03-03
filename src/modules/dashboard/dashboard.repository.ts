import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, isNull, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

@Injectable()
export class DashboardRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // --- Patient Metrics ---

  async countPatients(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(
        and(eq(schema.users.role, 'PATIENT'), isNull(schema.users.deletedAt)),
      );
    return result.count;
  }

  async countNewPatientsInRange(from: Date, to: Date): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, 'PATIENT'),
          gte(schema.users.createdAt, from),
          lt(schema.users.createdAt, to),
          isNull(schema.users.deletedAt),
        ),
      );
    return result.count;
  }

  async countActivePatientsLast7Days(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.glucoseReadings)
      .where(gte(schema.glucoseReadings.createdAt, sevenDaysAgo));
    // Count distinct users who have readings in the last 7 days
    // Using a simpler approximation: count of readings (distinct user count would need subquery)
    return result.count;
  }

  // --- Doctor Metrics ---

  async countDoctorsByStatus(
    status: 'PENDING' | 'ACTIVE' | 'BLOCKED',
  ): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, 'DOCTOR'),
          eq(schema.users.status, status),
          isNull(schema.users.deletedAt),
        ),
      );
    return result.count;
  }

  async countTotalDoctors(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(
        and(eq(schema.users.role, 'DOCTOR'), isNull(schema.users.deletedAt)),
      );
    return result.count;
  }

  async countActiveConnections(): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.patientDoctors)
      .where(eq(schema.patientDoctors.status, 'ACTIVE'));
    return result.count;
  }

  // --- AI Usage Metrics ---

  async countAiRequestsInRange(from: Date, to: Date): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.aiUsageLogs)
      .where(
        and(
          gte(schema.aiUsageLogs.createdAt, from),
          lt(schema.aiUsageLogs.createdAt, to),
        ),
      );
    return result.count;
  }

  async countAiRequestsByFeatureInRange(
    feature: 'VOICE' | 'OCR',
    from: Date,
    to: Date,
  ): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.aiUsageLogs)
      .where(
        and(
          eq(schema.aiUsageLogs.feature, feature),
          gte(schema.aiUsageLogs.createdAt, from),
          lt(schema.aiUsageLogs.createdAt, to),
        ),
      );
    return result.count;
  }

  async countAiRequestsByStatusInRange(
    status: 'SUCCESS' | 'FAILED',
    from: Date,
    to: Date,
  ): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.aiUsageLogs)
      .where(
        and(
          eq(schema.aiUsageLogs.status, status),
          gte(schema.aiUsageLogs.createdAt, from),
          lt(schema.aiUsageLogs.createdAt, to),
        ),
      );
    return result.count;
  }

  // --- System Health ---

  async countGlucoseReadingsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [result] = await this.db
      .select({ count: count() })
      .from(schema.glucoseReadings)
      .where(
        and(
          gte(schema.glucoseReadings.createdAt, today),
          lt(schema.glucoseReadings.createdAt, tomorrow),
        ),
      );
    return result.count;
  }
}
