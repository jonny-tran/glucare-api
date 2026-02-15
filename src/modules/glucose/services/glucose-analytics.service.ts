import { Injectable } from '@nestjs/common';
import { IGlucoseReading } from '../interfaces/glucose.interface';

@Injectable()
export class GlucoseAnalyticsService {
  calculateTIR(readings: IGlucoseReading[]) {
    // BR-09: Check sufficient data is handled at service level
    if (!readings.length) {
      return { tir: 0, tbr: 0, tar: 0 };
    }

    let inRange = 0;
    let belowRange = 0;
    let aboveRange = 0;

    for (const reading of readings) {
      const glucose = parseFloat(reading.glucoseValue);
      if (glucose < 70) {
        belowRange++;
      } else if (glucose > 180) {
        aboveRange++;
      } else {
        inRange++;
      }
    }

    const total = readings.length;
    return {
      tir: parseFloat(((inRange / total) * 100).toFixed(2)),
      tbr: parseFloat(((belowRange / total) * 100).toFixed(2)),
      tar: parseFloat(((aboveRange / total) * 100).toFixed(2)),
    };
  }

  estimateHbA1c(readings: IGlucoseReading[]): number | null {
    if (readings.length < 5) {
      return null;
    }

    const totalGlucose = readings.reduce(
      (sum, r) => sum + parseFloat(r.glucoseValue),
      0,
    );
    const avgGlucose = totalGlucose / readings.length;

    // Formula: (AverageBG + 46.7) / 28.7
    const hba1c = (avgGlucose + 46.7) / 28.7;
    return parseFloat(hba1c.toFixed(1)); // Usually 1 decimal place
  }

  determineStatus(glucoseValue: number): 'NORMAL' | 'LOW' | 'HIGH' {
    if (glucoseValue < 70) return 'LOW';
    if (glucoseValue > 180) return 'HIGH';
    return 'NORMAL';
  }
}
