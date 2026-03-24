import { Injectable } from '@nestjs/common';
import { SystemConfigKey } from '../../system-config/interfaces/system-config.interface';
import { SystemConfigService } from '../../system-config/system-config.service';
import { IGlucoseReading } from '../interfaces/glucose.interface';

@Injectable()
export class GlucoseAnalyticsService {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  async calculateTIR(readings: IGlucoseReading[]) {
    // BR-09: Check sufficient data is handled at service level
    if (!readings.length) {
      return { tir: 0, tbr: 0, tar: 0 };
    }

    // Lấy ngưỡng từ SystemConfig (thay vì hardcode 70/180)
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

    let inRange = 0;
    let belowRange = 0;
    let aboveRange = 0;

    for (const reading of readings) {
      const glucose = parseFloat(reading.glucoseValue);
      if (glucose < safeMin) {
        belowRange++;
      } else if (glucose > safeMax) {
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

  async determineStatus(
    glucoseValue: number,
  ): Promise<'NORMAL' | 'LOW' | 'HIGH'> {
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

    if (glucoseValue < safeMin) return 'LOW';
    if (glucoseValue > safeMax) return 'HIGH';
    return 'NORMAL';
  }
}
