import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersController } from './reminders.controller';
import { RemindersProcessor } from './reminders.processor';
import { RemindersRepository } from './reminders.repository';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'reminders',
    }),
  ],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersRepository, RemindersProcessor],
  exports: [RemindersService],
})
export class RemindersModule {}
