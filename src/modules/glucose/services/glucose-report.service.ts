import { Injectable } from '@nestjs/common';
import { GlucoseRepository } from '../glucose.repository';
import { IReportSummary } from '../interfaces/report.interface';

@Injectable()
export class GlucoseReportService {
  constructor(private readonly glucoseRepository: GlucoseRepository) {}

  async getReportSummary(
    userId: string,
    periodDays: number = 7,
  ): Promise<IReportSummary> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - periodDays);

    const readings = await this.glucoseRepository.findByDateRange(
      userId,
      startDate,
      endDate,
    );

    if (!readings.length) {
      return {
        period: `${periodDays} ngày`,
        mealDistribution: {},
        glycemicVariability: { sd: 0 },
        compliance: {
          totalReadings: 0,
          daysWithReadings: 0,
          score: 0,
        },
      };
    }

    // 1. Meal Distribution
    const distribution: Record<string, number> = {};
    for (const r of readings) {
      distribution[r.mealContext] = (distribution[r.mealContext] || 0) + 1;
    }
    // Convert to percentage
    const total = readings.length;
    for (const key in distribution) {
      distribution[key] = parseFloat(
        ((distribution[key] / total) * 100).toFixed(1),
      );
    }

    // 2. Glycemic Variability (SD)
    const values = readings.map((r) => parseFloat(r.glucoseValue));
    const mean = values.reduce((a, b) => a + b, 0) / total;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      (total > 1 ? total - 1 : 1);
    const sd = Math.sqrt(variance);

    // 3. Compliance
    // Target: 4 readings per day
    // Count days with readings? Assuming simpler model: Total Readings vs (Days * Target)
    const targetPerDay = 4;
    const targetTotal = periodDays * targetPerDay;
    const complianceScore = Math.min(
      parseFloat(((total / targetTotal) * 100).toFixed(1)),
      100, // Cap at 100%
    );

    // Calculate unique days with readings
    const uniqueDays = new Set(
      readings.map((r) => new Date(r.recordedAt).toISOString().split('T')[0]),
    );

    return {
      period: `${periodDays} ngày qua`,
      mealDistribution: distribution,
      glycemicVariability: {
        sd: parseFloat(sd.toFixed(1)),
      },
      compliance: {
        totalReadings: total,
        daysWithReadings: uniqueDays.size,
        score: complianceScore,
      },
    };
  }
}
