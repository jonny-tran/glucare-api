import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { RemindersRepository } from './reminders.repository';
import { calculateUtcCron } from './utils/timezone.util';

@Injectable()
export class RemindersService {
  constructor(
    private readonly repo: RemindersRepository,
    @InjectQueue('reminders') private readonly remindersQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateReminderDto) {
    // 4. Logic Clean-up trước khi khởi tạo:
    // Xóa/Đồng bộ lại tất cả Repeatable Jobs cũ của User để tránh job "ma" tích tụ
    await this.cleanupUserJobs(userId);

    const reminder = await this.repo.create(userId, dto);

    if (reminder.isActive) {
      await this.scheduleReminder(
        reminder.id,
        reminder.userId,
        reminder.time,
        reminder.daysOfWeek as number[],
        reminder.timezone || 'Asia/Ho_Chi_Minh',
        reminder.title,
      );
    }

    return reminder;
  }

  async findAll(userId: string) {
    return this.repo.findAllByUser(userId);
  }

  async findOne(id: string) {
    const reminder = await this.repo.findById(id);
    if (!reminder) {
      throw new NotFoundException('Không tìm thấy nhắc nhở');
    }
    return reminder;
  }

  async update(id: string, dto: UpdateReminderDto) {
    const reminder = await this.findOne(id);
    const updated = await this.repo.update(id, dto);

    // Xử lý Job
    if (dto.isActive === false) {
      await this.removeJob(reminder.id);
    } else if (
      dto.isActive === true ||
      dto.time ||
      dto.daysOfWeek ||
      dto.timezone
    ) {
      // Nếu có sự thay đổi ảnh hưởng đến schedule
      await this.removeJob(reminder.id);

      const newTime = dto.time || updated.time;
      const newDays = dto.daysOfWeek || (updated.daysOfWeek as number[]);
      const newTimezone =
        dto.timezone || updated.timezone || 'Asia/Ho_Chi_Minh';
      const newTitle = dto.title || updated.title;

      if (updated.isActive) {
        await this.scheduleReminder(
          updated.id,
          updated.userId,
          newTime,
          newDays,
          newTimezone,
          newTitle,
        );
      }
    }

    return updated;
  }

  async remove(id: string) {
    const reminder = await this.findOne(id);
    await this.repo.softDelete(id);
    await this.removeJob(reminder.id);
    return { success: true };
  }

  private async scheduleReminder(
    id: string,
    userId: string,
    time: string,
    daysOfWeek: number[],
    timezone: string,
    title: string,
  ) {
    // Luôn dọn dẹp job cũ của cùng một id để đề phòng duplicated jobs nếu có
    await this.removeJob(id);

    const cronExp = calculateUtcCron(time, daysOfWeek, timezone);
    if (!cronExp) return;

    await this.remindersQueue.add(
      'send-reminder',
      {
        reminderId: id,
        userId: userId,
        title: title,
      },
      {
        jobId: `reminder-${id}`,
        repeat: { pattern: cronExp },
      },
    );
  }

  private async removeJob(id: string) {
    const jobId = `reminder-${id}`;

    // We need to fetch repeatable jobs and remove the matching one
    const repeatableJobs = await this.remindersQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.id === jobId) {
        await this.remindersQueue.removeRepeatableByKey(job.key);
      }
    }
  }

  private async cleanupUserJobs(userId: string) {
    const userReminders = await this.repo.findAllByUser(userId);
    const userReminderIds = new Set(
      userReminders.map((r) => `reminder-${r.id}`),
    );

    const repeatableJobs = await this.remindersQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.id && userReminderIds.has(job.id)) {
        await this.remindersQueue.removeRepeatableByKey(job.key);
      }
    }

    for (const reminder of userReminders) {
      if (reminder.isActive) {
        const cronExp = calculateUtcCron(
          reminder.time,
          reminder.daysOfWeek as number[],
          reminder.timezone || 'Asia/Ho_Chi_Minh',
        );

        if (cronExp) {
          await this.remindersQueue.add(
            'send-reminder',
            {
              reminderId: reminder.id,
              userId: reminder.userId,
              title: reminder.title,
            },
            {
              jobId: `reminder-${reminder.id}`,
              repeat: { pattern: cronExp },
            },
          );
        }
      }
    }
  }
}
