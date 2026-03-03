import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigKey } from 'src/modules/system-config/interfaces/system-config.interface';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { IGlucoseReading } from '../interfaces/glucose.interface';
import { GlucoseAnalyticsService } from './glucose-analytics.service';

describe('GlucoseAnalyticsService', () => {
  let service: GlucoseAnalyticsService;

  const mockSystemConfigService = {
    getConfigValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlucoseAnalyticsService,
        { provide: SystemConfigService, useValue: mockSystemConfigService },
      ],
    }).compile();

    service = module.get<GlucoseAnalyticsService>(GlucoseAnalyticsService);

    // Default mock: ADA standard thresholds
    mockSystemConfigService.getConfigValue.mockImplementation(
      async (key: SystemConfigKey) => {
        if (key === SystemConfigKey.GLUCOSE_SAFE_MIN) return 70;
        if (key === SystemConfigKey.GLUCOSE_SAFE_MAX) return 180;
        return null;
      },
    );
  });

  describe('calculateTIR', () => {
    it('should calculate TIR correctly (70-180 mg/dL)', async () => {
      const readings: IGlucoseReading[] = [
        { glucoseValue: '60' }, // Low
        { glucoseValue: '70' }, // In Range
        { glucoseValue: '100' }, // In Range
        { glucoseValue: '180' }, // In Range
        { glucoseValue: '190' }, // High
      ] as any;

      const result = await service.calculateTIR(readings);
      // Total 5. Low 1, InRange 3, High 1.
      // TIR = 3/5 = 60%
      // TBR = 1/5 = 20%
      // TAR = 1/5 = 20%
      expect(result.tir).toBe(60);
      expect(result.tbr).toBe(20);
      expect(result.tar).toBe(20);
    });

    it('should return 0s if no readings', async () => {
      const result = await service.calculateTIR([]);
      expect(result).toEqual({ tir: 0, tbr: 0, tar: 0 });
    });
  });

  describe('estimateHbA1c', () => {
    it('should return null if readings < 5 (BR-09)', () => {
      const readings: IGlucoseReading[] = [
        { glucoseValue: '100' },
        { glucoseValue: '110' },
        { glucoseValue: '120' },
        { glucoseValue: '130' },
      ] as any;
      expect(service.estimateHbA1c(readings)).toBeNull();
    });

    it('should calculate HbA1c correctly with sufficient data', () => {
      // Formula: (Avg + 46.7) / 28.7
      // Let avg be 100. HbA1c = (100 + 46.7) / 28.7 = 146.7 / 28.7 = 5.111 -> 5.1
      const readings: IGlucoseReading[] = [
        { glucoseValue: '100' },
        { glucoseValue: '100' },
        { glucoseValue: '100' },
        { glucoseValue: '100' },
        { glucoseValue: '100' },
      ] as any;

      expect(service.estimateHbA1c(readings)).toBe(5.1);
    });
  });

  describe('determineStatus', () => {
    it('should return LOW if < 70', async () => {
      expect(await service.determineStatus(69)).toBe('LOW');
    });

    it('should return NORMAL if 70-180', async () => {
      expect(await service.determineStatus(70)).toBe('NORMAL');
      expect(await service.determineStatus(180)).toBe('NORMAL');
    });

    it('should return HIGH if > 180', async () => {
      expect(await service.determineStatus(181)).toBe('HIGH');
    });
  });
});
