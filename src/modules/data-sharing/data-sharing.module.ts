import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../users/users.module';
import { DataSharingController } from './data-sharing.controller';
import { DataSharingRepository } from './data-sharing.repository';
import { DataSharingService } from './data-sharing.service';
import { SharingGuard } from './guards/sharing.guard';

@Module({
  imports: [UsersModule, DatabaseModule],
  controllers: [DataSharingController],
  providers: [DataSharingService, DataSharingRepository, SharingGuard],
  exports: [DataSharingService, SharingGuard], // Export Guard if used globally or via module
})
export class DataSharingModule {}
