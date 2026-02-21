import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

@Injectable()
export class RemindersRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, dto: CreateReminderDto) {
    const defaultTimezone = dto.timezone || 'Asia/Ho_Chi_Minh';
    const [result] = await this.db
      .insert(schema.reminders)
      .values({
        userId,
        medicationId: dto.medicationId,
        title: dto.title,
        type: dto.type,
        time: dto.time,
        daysOfWeek: dto.daysOfWeek,
        timezone: defaultTimezone,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      })
      .returning();
    return result;
  }

  async findAllByUser(userId: string) {
    return this.db.query.reminders.findMany({
      where: and(
        eq(schema.reminders.userId, userId),
        isNull(schema.reminders.deletedAt),
      ),
      orderBy: [desc(schema.reminders.createdAt)],
    });
  }

  async findById(id: string) {
    return this.db.query.reminders.findFirst({
      where: and(
        eq(schema.reminders.id, id),
        isNull(schema.reminders.deletedAt),
      ),
    });
  }

  async update(id: string, dto: UpdateReminderDto) {
    const updateData: any = { ...dto, updatedAt: new Date() };

    const [result] = await this.db
      .update(schema.reminders)
      .set(updateData)
      .where(eq(schema.reminders.id, id))
      .returning();
    return result;
  }

  async softDelete(id: string) {
    const [result] = await this.db
      .update(schema.reminders)
      .set({ deletedAt: new Date(), isActive: false })
      .where(eq(schema.reminders.id, id))
      .returning();
    return result;
  }
}
