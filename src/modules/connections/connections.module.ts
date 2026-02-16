import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DataSharingModule } from '../data-sharing/data-sharing.module';
import { UsersModule } from '../users/users.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionsService } from './connections.service';

@Module({
  imports: [UsersModule, DataSharingModule, DatabaseModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, ConnectionsRepository],
  exports: [ConnectionsService, ConnectionsRepository],
})
export class ConnectionsModule {}
