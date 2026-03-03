import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigRepository } from './system-config.repository';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [DatabaseModule, CacheModule.register()],
  controllers: [SystemConfigController],
  providers: [SystemConfigService, SystemConfigRepository],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
