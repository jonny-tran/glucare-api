import { Injectable } from '@nestjs/common';
import { GlucoseRepository } from '../glucose.repository';
import { IDashboardData } from '../interfaces/dashboard.interface';

@Injectable()
export class GlucoseDashboardService {
  constructor(private readonly glucoseRepository: GlucoseRepository) {}

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
    // "Current 24h" usually means "last 24 hours" or "today". Let's assume "Today" vs "Yesterday" for simplicity, or "Last 24h" per spec?
    // "Average of current 24h vs. previous 24h". Usually better to mean Today vs Yesterday as user sees "Today's Avg".
    // I will use Today vs Yesterday.
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
      .reverse(); // Chronological order for chart? Usually sparkline is time series.

    const statusLabel = latestReading
      ? this.getStatusLabel(parseFloat(latestReading.glucoseValue))
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
        target: 4, // From requirements or constant
      },
      trend,
      sparkline,
    };
  }

  private getStatusLabel(value: number): string {
    if (value < 70) return 'Thấp'; // Low
    if (value >= 70 && value <= 180) return 'Bình thường'; // Normal
    if (value > 180 && value <= 250) return 'Cao'; // High
    return 'Nguy hiểm'; // Dangerous (Very High)
  }
}
