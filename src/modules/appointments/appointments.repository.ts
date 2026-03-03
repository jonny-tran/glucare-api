import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, lte, or, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IPaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { DATABASE_CONNECTION } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { AppointmentFilterDto } from './dto/appointment-filter.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

@Injectable()
export class AppointmentsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, data: CreateAppointmentDto) {
    const [result] = await this.db
      .insert(schema.appointments)
      .values({
        userId,
        doctorId: data.doctorId,
        appointmentDate: new Date(data.appointmentDate),
      })
      .returning();
    return result;
  }

  async findById(id: string) {
    return this.db.query.appointments.findFirst({
      where: eq(schema.appointments.id, id),
      with: {
        user: true,
        doctor: {
          with: { user: true },
        },
      },
    });
  }

  /**
   * Lấy danh sách lịch hẹn theo vai trò (Patient xem theo userId, Doctor xem theo doctorId).
   * Hỗ trợ phân trang và lọc theo status, startDate, endDate.
   */
  async findAll(
    roleId: string,
    roleType: 'PATIENT' | 'DOCTOR',
    filter: AppointmentFilterDto,
  ): Promise<IPaginatedResponse<typeof schema.appointments.$inferSelect>> {
    const { page = 1, limit = 10, status, startDate, endDate } = filter;
    const offset = (page - 1) * limit;

    // Build conditions array with initial role-based filter
    const baseConditions: SQL<unknown>[] = [
      roleType === 'PATIENT'
        ? eq(schema.appointments.userId, roleId)
        : eq(schema.appointments.doctorId, roleId),
    ];

    if (status) {
      baseConditions.push(
        eq(schema.appointments.status, status as AppointmentStatus),
      );
    }
    if (startDate) {
      baseConditions.push(
        gte(schema.appointments.appointmentDate, new Date(startDate)),
      );
    }
    if (endDate) {
      baseConditions.push(
        lte(schema.appointments.appointmentDate, new Date(endDate)),
      );
    }

    const [totalRecord] = await this.db
      .select({ count: count() })
      .from(schema.appointments)
      .where(and(...baseConditions));

    const data = await this.db.query.appointments.findMany({
      where: and(...baseConditions),
      limit,
      offset,
      orderBy: [desc(schema.appointments.appointmentDate)],
      with: {
        user: true,
        doctor: {
          with: { user: true },
        },
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

  /**
   * Tìm các lịch hẹn chồng chéo: cùng userId, trạng thái PENDING/CONFIRMED,
   * trong khoảng thời gian [startTime, endTime].
   */
  async findOverlapping(userId: string, startTime: Date, endTime: Date) {
    return this.db
      .select()
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.userId, userId),
          or(
            eq(schema.appointments.status, 'PENDING'),
            eq(schema.appointments.status, 'CONFIRMED'),
          ),
          gte(schema.appointments.appointmentDate, startTime),
          lte(schema.appointments.appointmentDate, endTime),
        ),
      );
  }

  async updateStatus(id: string, status: string, reason?: string) {
    const typedStatus = status as AppointmentStatus;
    const [result] = await this.db
      .update(schema.appointments)
      .set({
        status: typedStatus,
        reason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.appointments.id, id))
      .returning();
    return result;
  }
}
