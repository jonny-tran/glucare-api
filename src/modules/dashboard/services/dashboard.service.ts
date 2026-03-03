import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type { IDashboardOverview } from '../interfaces/dashboard.interface';
import {
  DASHBOARD_CACHE_KEY,
  DashboardCronService,
} from './dashboard-cron.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly dashboardCronService: DashboardCronService,
  ) {}

  /**
   * Lấy dữ liệu Dashboard từ cache.
   * Fallback: Nếu cache rỗng (hệ thống vừa khởi động), kích hoạt tính toán 1 lần.
   */
  async getOverview(): Promise<IDashboardOverview> {
    const cached =
      await this.cacheManager.get<IDashboardOverview>(DASHBOARD_CACHE_KEY);
    if (cached) {
      return cached;
    }

    // Fallback: Cache rỗng -> tính toán 1 lần
    this.logger.warn('Cache Dashboard rỗng, kích hoạt tính toán...');
    return this.dashboardCronService.aggregateDashboardData();
  }

  /**
   * Force refresh: Tính toán lại ngay lập tức và ghi đè cache.
   */
  async forceRefresh(): Promise<IDashboardOverview> {
    this.logger.log('Force refresh Dashboard data...');
    return this.dashboardCronService.aggregateDashboardData();
  }
}
