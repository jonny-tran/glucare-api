import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

@Injectable()
export class NotificationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async upsertToken(userId: string, fcmToken: string, deviceType?: string) {
    return this.db
      .insert(schema.notificationTokens)
      .values({
        userId,
        fcmToken,
        deviceType,
      })
      .onConflictDoUpdate({
        target: schema.notificationTokens.fcmToken,
        set: { userId, deviceType, updatedAt: new Date() },
      })
      .returning();
  }

  async removeToken(fcmToken: string) {
    return this.db
      .delete(schema.notificationTokens)
      .where(eq(schema.notificationTokens.fcmToken, fcmToken));
  }

  async getTokensByUser(userId: string) {
    return this.db.query.notificationTokens.findMany({
      where: eq(schema.notificationTokens.userId, userId),
    });
  }
}
