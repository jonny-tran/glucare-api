import { Injectable } from '@nestjs/common';
import { CreateGlucoseDto } from './dto/create-glucose.dto';
import { GlucoseFilterDto, UpdateGlucoseDto } from './dto/glucose-filter.dto';
import { IGlucoseReading } from './interfaces/glucose.interface';
import { GlucoseAnalyticsService } from './services/glucose-analytics.service';
import { GlucoseDashboardService } from './services/glucose-dashboard.service';
import { GlucoseReportService } from './services/glucose-report.service';
import { GlucoseStorageService } from './services/glucose-storage.service';

@Injectable()
export class GlucoseService {
  constructor(
    private readonly storageService: GlucoseStorageService,
    private readonly analyticsService: GlucoseAnalyticsService,
    private readonly dashboardService: GlucoseDashboardService,
    private readonly reportService: GlucoseReportService,
  ) {}

  async create(userId: string, createGlucoseDto: CreateGlucoseDto) {
    return this.storageService.create(userId, createGlucoseDto);
  }

  async findAll(userId: string, query: GlucoseFilterDto) {
    return this.storageService.findAll(userId, query);
  }

  async findOne(id: string, userId: string) {
    return this.storageService.findOne(id, userId);
  }

  async update(id: string, userId: string, data: UpdateGlucoseDto) {
    return this.storageService.update(id, userId, data);
  }

  async remove(id: string, userId: string) {
    return this.storageService.softDelete(id, userId);
  }

  async getHistory(userId: string, query: GlucoseFilterDto) {
    return this.storageService.findAll(userId, query);
  }

  /** Lần đo gần nhất (E-04), dùng cho double-check nhập liệu đa phương tiện. */
  async getLatestReading(userId: string) {
    return this.storageService.findLatest(userId);
  }

  async getDashboardData(userId: string) {
    return this.dashboardService.getDashboardData(userId);
  }

  async getAnalytics(userId: string, days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const readings = await this.storageService.findByDateRange(
      userId,
      startDate,
      endDate,
    );

    // Cast Drizzle result to IGlucoseReading[] for Analytics service
    const safeReadings = readings as unknown as IGlucoseReading[];

    const tirStats = await this.analyticsService.calculateTIR(safeReadings);
    const hba1c = this.analyticsService.estimateHbA1c(safeReadings);

    // BR-09: Sparse data check for analytics response
    const isSparseData = readings.length < 5;

    const chartData = readings.map((r) => ({
      date: r.recordedAt.toISOString().split('T')[0],
      value: parseFloat(r.glucoseValue),
      type: r.readingType,
    }));

    return {
      period: `${days} ngày`,
      stats: tirStats,
      hba1c,
      isSparseData,
      chartData,
    };
  }

  async getReportSummary(userId: string, days: number = 7) {
    return this.reportService.getReportSummary(userId, days);
  }
}
