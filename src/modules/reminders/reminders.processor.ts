import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { RemindersRepository } from './reminders.repository';

@Processor('reminders', {
  concurrency: 1,
  drainDelay: 10,
  lockDuration: 30000,
  stalledInterval: 30000,
})
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(
    private readonly repo: RemindersRepository,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(
    job: Job<{ reminderId: string; userId: string; title: string }>,
  ) {
    this.logger.log(`Processing reminder job: ${job.id}`);
    const data = job.data;
    const reminderId = data.reminderId;

    if (!reminderId) return;

    // Check if reminder is still active and not deleted
    const reminder = await this.repo.findById(reminderId);

    if (!reminder) {
      this.logger.log(`Reminder ${reminderId} not found, skipping.`);
      return;
    }

    if (!reminder.isActive) {
      this.logger.log(`Reminder ${reminderId} is not active, skipping.`);
      return;
    }

    // Call NotificationService to send push notification
    await this.notificationsService.sendPushToUser(
      reminder.userId,
      reminder.title,
      'Đã đến giờ cho lịch nhắc nhở của bạn.',
      { reminderId: reminder.id, type: reminder.type },
    );

    this.logger.log(
      `Successfully sent reminder push to user ${reminder.userId}`,
    );
  }
}
