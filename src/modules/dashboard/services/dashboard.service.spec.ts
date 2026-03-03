import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import type { IDashboardOverview } from '../interfaces/dashboard.interface';
import { DashboardCronService } from './dashboard-cron.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockOverview: IDashboardOverview = {
    patients: {
      totalPatients: 100,
      newPatientsThisMonth: 10,
      growthPercentage: 5,
      activePatients7Days: 50,
    },
    doctors: {
      totalDoctors: 20,
      pendingDoctors: 2,
      activeDoctors: 15,
      blockedDoctors: 3,
      activeConnections: 30,
    },
    aiTracking: {
      totalRequestsThisMonth: 500,
      voiceUsagePercentage: 60,
      ocrUsagePercentage: 40,
      successRatePercentage: 95,
      failedRequests: 25,
    },
    systemHealth: {
      dataIngestionToday: 200,
      publishedArticles: 15,
      draftArticles: 5,
    },
    lastUpdatedAt: new Date(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockCronService = {
    aggregateDashboardData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: DashboardCronService, useValue: mockCronService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return cached data if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockOverview);

      const result = await service.getOverview();

      expect(result).toEqual(mockOverview);
      expect(mockCronService.aggregateDashboardData).not.toHaveBeenCalled();
    });

    it('should trigger live aggregation if cache is empty (fallback)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockCronService.aggregateDashboardData.mockResolvedValue(mockOverview);

      const result = await service.getOverview();

      expect(result).toEqual(mockOverview);
      expect(mockCronService.aggregateDashboardData).toHaveBeenCalled();
    });
  });

  describe('forceRefresh', () => {
    it('should always trigger live aggregation', async () => {
      mockCronService.aggregateDashboardData.mockResolvedValue(mockOverview);

      const result = await service.forceRefresh();

      expect(result).toEqual(mockOverview);
      expect(mockCronService.aggregateDashboardData).toHaveBeenCalled();
    });
  });
});
