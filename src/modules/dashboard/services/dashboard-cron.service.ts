import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Cache } from 'cache-manager';
import { ArticleRepository } from 'src/modules/blog/repositories/article.repository';
import { DashboardRepository } from '../dashboard.repository';
import type { IDashboardOverview } from '../interfaces/dashboard.interface';

export const DASHBOARD_CACHE_KEY = 'ADMIN_DASHBOARD_OVERVIEW_DATA';

@Injectable()
export class DashboardCronService {
  private readonly logger = new Logger(DashboardCronService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly articleRepository: ArticleRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Cronjob: Chạy mỗi 1 giờ, tính toán chỉ số dashboard và lưu vào cache
   */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateDashboardData(): Promise<IDashboardOverview> {
    this.logger.log('⏰ Bắt đầu tính toán Dashboard metrics...');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // --- Patient Metrics ---
    const [
      totalPatients,
      newPatientsThisMonth,
      newPatientsLastMonth,
      activePatients7Days,
    ] = await Promise.all([
      this.dashboardRepository.countPatients(),
      this.dashboardRepository.countNewPatientsInRange(
        startOfMonth,
        endOfMonth,
      ),
      this.dashboardRepository.countNewPatientsInRange(
        startOfPrevMonth,
        endOfPrevMonth,
      ),
      this.dashboardRepository.countActivePatientsLast7Days(),
    ]);

    // Tránh division by zero
    const growthPercentage =
      newPatientsLastMonth > 0
        ? parseFloat(
            (
              ((newPatientsThisMonth - newPatientsLastMonth) /
                newPatientsLastMonth) *
              100
            ).toFixed(2),
          )
        : newPatientsThisMonth > 0
          ? 100
          : 0;

    // --- Doctor Metrics ---
    const [
      totalDoctors,
      pendingDoctors,
      activeDoctors,
      blockedDoctors,
      activeConnections,
    ] = await Promise.all([
      this.dashboardRepository.countTotalDoctors(),
      this.dashboardRepository.countDoctorsByStatus('PENDING'),
      this.dashboardRepository.countDoctorsByStatus('ACTIVE'),
      this.dashboardRepository.countDoctorsByStatus('BLOCKED'),
      this.dashboardRepository.countActiveConnections(),
    ]);

    // --- AI Cost Metrics ---
    const [totalAiRequests, voiceRequests, ocrRequests, failedRequests] =
      await Promise.all([
        this.dashboardRepository.countAiRequestsInRange(
          startOfMonth,
          endOfMonth,
        ),
        this.dashboardRepository.countAiRequestsByFeatureInRange(
          'VOICE',
          startOfMonth,
          endOfMonth,
        ),
        this.dashboardRepository.countAiRequestsByFeatureInRange(
          'OCR',
          startOfMonth,
          endOfMonth,
        ),
        this.dashboardRepository.countAiRequestsByStatusInRange(
          'FAILED',
          startOfMonth,
          endOfMonth,
        ),
      ]);

    const voicePercentage =
      totalAiRequests > 0
        ? parseFloat(((voiceRequests / totalAiRequests) * 100).toFixed(2))
        : 0;
    const ocrPercentage =
      totalAiRequests > 0
        ? parseFloat(((ocrRequests / totalAiRequests) * 100).toFixed(2))
        : 0;
    const successRate =
      totalAiRequests > 0
        ? parseFloat(
            (
              ((totalAiRequests - failedRequests) / totalAiRequests) *
              100
            ).toFixed(2),
          )
        : 0;

    // --- System Health ---
    const [dataIngestionToday, publishedArticles, draftArticles] =
      await Promise.all([
        this.dashboardRepository.countGlucoseReadingsToday(),
        this.articleRepository.countPublished(),
        this.articleRepository.countDraft(),
      ]);

    const overview: IDashboardOverview = {
      patients: {
        totalPatients,
        newPatientsThisMonth,
        growthPercentage,
        activePatients7Days,
      },
      doctors: {
        totalDoctors,
        pendingDoctors,
        activeDoctors,
        blockedDoctors,
        activeConnections,
      },
      aiTracking: {
        totalRequestsThisMonth: totalAiRequests,
        voiceUsagePercentage: voicePercentage,
        ocrUsagePercentage: ocrPercentage,
        successRatePercentage: successRate,
        failedRequests,
      },
      systemHealth: {
        dataIngestionToday,
        publishedArticles,
        draftArticles,
      },
      lastUpdatedAt: new Date(),
    };

    // Lưu vào cache (TTL = 0 => không tự hết hạn)
    await this.cacheManager.set(DASHBOARD_CACHE_KEY, overview, 0);
    this.logger.log('✅ Dashboard metrics đã được cập nhật và lưu vào cache');

    return overview;
  }
}
