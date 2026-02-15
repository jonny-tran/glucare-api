import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { MedicationsController } from './medications.controller';
import { MedicationsRepository } from './medications.repository';
import { MedicationsService } from './medications.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedicationsRepository],
  exports: [MedicationsService, MedicationsRepository],
})
export class MedicationsModule {}
