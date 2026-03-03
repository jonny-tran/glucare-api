import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';

@Injectable()
export class SystemConfigRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.select().from(schema.systemConfigs);
  }

  async findByKey(key: (typeof schema.systemConfigKeyEnum.enumValues)[number]) {
    const [config] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key));
    return config || null;
  }

  async updateByKey(
    key: (typeof schema.systemConfigKeyEnum.enumValues)[number],
    value: unknown,
    updatedBy: string,
    description?: string,
  ) {
    const setData: Record<string, unknown> = {
      value,
      updatedBy,
      updatedAt: new Date(),
    };

    if (description !== undefined) {
      setData.description = description;
    }

    const [updated] = await this.db
      .update(schema.systemConfigs)
      .set(setData)
      .where(eq(schema.systemConfigs.key, key))
      .returning();

    return updated;
  }
}
