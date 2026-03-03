import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SystemConfigModule } from 'src/modules/system-config/system-config.module';
import { GlucoseController } from './glucose.controller';
import { GlucoseRepository } from './glucose.repository';
import { GlucoseService } from './glucose.service';
import { GlucoseAnalyticsService } from './services/glucose-analytics.service';
import { GlucoseDashboardService } from './services/glucose-dashboard.service';
import { GlucoseReportService } from './services/glucose-report.service';
import { GlucoseStorageService } from './services/glucose-storage.service';

@Module({
  imports: [DatabaseModule, SystemConfigModule],
  controllers: [GlucoseController],
  providers: [
    GlucoseService,
    GlucoseRepository,
    GlucoseAnalyticsService,
    GlucoseStorageService,
    GlucoseDashboardService,
    GlucoseReportService,
  ],
  exports: [GlucoseService, GlucoseRepository, GlucoseAnalyticsService],
})
export class GlucoseModule {}
