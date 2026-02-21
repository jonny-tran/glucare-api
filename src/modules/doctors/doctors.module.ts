import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConnectionsModule } from '../connections/connections.module';
import { DataSharingModule } from '../data-sharing/data-sharing.module';
import { GlucoseModule } from '../glucose/glucose.module';
import { MealsModule } from '../meals/meals.module';
import { MedicationsModule } from '../medications/medications.module';
import { UsersModule } from '../users/users.module';
import { DoctorNotesRepository } from './doctor-notes.repository';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [
    UsersModule,
    ConnectionsModule,
    GlucoseModule,
    MealsModule,
    MedicationsModule,
    DatabaseModule,
    DataSharingModule,
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorNotesRepository],
  exports: [DoctorsService, DoctorNotesRepository],
})
export class DoctorsModule {}
