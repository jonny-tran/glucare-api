import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ConnectionsModule } from '../connections/connections.module';
import { UsersModule } from '../users/users.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [
    DatabaseModule,
    ConnectionsModule, // Cần ConnectionsRepository để check kết nối Patient-Doctor
    UsersModule, // Cần UsersRepository để resolve userId -> patientId/doctorId
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService, AppointmentsRepository],
})
export class AppointmentsModule {}
