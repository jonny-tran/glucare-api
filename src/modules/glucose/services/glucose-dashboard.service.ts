import { Injectable } from '@nestjs/common';
import { SystemConfigKey } from 'src/modules/system-config/interfaces/system-config.interface';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { GlucoseRepository } from '../glucose.repository';
import { IDashboardData } from '../interfaces/dashboard.interface';

@Injectable()
export class GlucoseDashboardService {
  constructor(
    private readonly glucoseRepository: GlucoseRepository,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async getDashboardData(userId: string): Promise<IDashboardData> {
    const latestReading = await this.glucoseRepository.findLatest(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAvg, todayCount] = await Promise.all([
      this.glucoseRepository.calculateAverage(userId, today, tomorrow),
      this.glucoseRepository.countReadings(userId, today, tomorrow),
    ]);

    // Trend: Compare current 24h vs previous 24h
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayAvg = await this.glucoseRepository.calculateAverage(
      userId,
      yesterday,
      today,
    );

    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (todayAvg && yesterdayAvg) {
      const diff = todayAvg - yesterdayAvg;
      if (diff > 5) trend = 'UP';
      else if (diff < -5) trend = 'DOWN';
    }

    // Sparkline: Last 10
    const last10 = await this.glucoseRepository.findLatestN(userId, 10);
    const sparkline = last10
      .map((r) => ({
        value: parseFloat(r.glucoseValue),
        recordedAt: r.recordedAt,
      }))
      .reverse(); // Chronological order for chart

    const statusLabel = latestReading
      ? await this.getStatusLabel(parseFloat(latestReading.glucoseValue))
      : '';

    return {
      latestReading: latestReading
        ? {
            value: parseFloat(latestReading.glucoseValue),
            unit: 'mg/dL',
            mealContext: latestReading.mealContext,
            statusLabel,
            recordedAt: latestReading.recordedAt,
          }
        : null,
      daySummary: {
        average: todayAvg ? parseFloat(todayAvg.toFixed(1)) : null,
        totalReadings: todayCount,
        target: 4,
      },
      trend,
      sparkline,
    };
  }

  private async getStatusLabel(value: number): Promise<string> {
    const safeMin = Number(
      await this.systemConfigService.getConfigValue(
        SystemConfigKey.GLUCOSE_SAFE_MIN,
      ),
    );
    const safeMax = Number(
      await this.systemConfigService.getConfigValue(
        SystemConfigKey.GLUCOSE_SAFE_MAX,
      ),
    );

    if (value < safeMin) return 'Thấp';
    if (value >= safeMin && value <= safeMax) return 'Bình thường';
    if (value > safeMax && value <= safeMax + 70) return 'Cao'; // Approximately +70 for "High" zone
    return 'Nguy hiểm';
  }
}
