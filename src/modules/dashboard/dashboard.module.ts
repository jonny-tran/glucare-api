import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from 'src/database/database.module';
import { BlogModule } from 'src/modules/blog/blog.module';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardCronService } from './services/dashboard-cron.service';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [
    DatabaseModule,
    CacheModule.register(),
    ScheduleModule.forRoot(),
    BlogModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardCronService, DashboardRepository],
})
export class DashboardModule {}
