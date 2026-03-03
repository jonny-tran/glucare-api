import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigKey } from './interfaces/system-config.interface';
import { SystemConfigRepository } from './system-config.repository';
import { SystemConfigService } from './system-config.service';

describe('SystemConfigService', () => {
  let service: SystemConfigService;

  const mockRepository = {
    findAll: jest.fn(),
    findByKey: jest.fn(),
    updateByKey: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: SystemConfigRepository, useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should load all configs into cache on startup', async () => {
      const configs = [
        { key: 'GLUCOSE_SAFE_MIN', value: 70 },
        { key: 'GLUCOSE_SAFE_MAX', value: 180 },
      ];
      mockRepository.findAll.mockResolvedValue(configs);

      await service.onModuleInit();

      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledTimes(2);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'config_GLUCOSE_SAFE_MIN',
        70,
        0,
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'config_GLUCOSE_SAFE_MAX',
        180,
        0,
      );
    });
  });

  describe('getConfigValue', () => {
    it('should return cached value if available', async () => {
      mockCacheManager.get.mockResolvedValue(70);

      const result = await service.getConfigValue(
        SystemConfigKey.GLUCOSE_SAFE_MIN,
      );

      expect(result).toBe(70);
      expect(mockRepository.findByKey).not.toHaveBeenCalled();
    });

    it('should query DB and set cache on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findByKey.mockResolvedValue({
        key: 'GLUCOSE_SAFE_MIN',
        value: 70,
      });

      const result = await service.getConfigValue(
        SystemConfigKey.GLUCOSE_SAFE_MIN,
      );

      expect(result).toBe(70);
      expect(mockRepository.findByKey).toHaveBeenCalledWith('GLUCOSE_SAFE_MIN');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'config_GLUCOSE_SAFE_MIN',
        70,
        0,
      );
    });

    it('should throw NotFoundException on cache miss and DB miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findByKey.mockResolvedValue(null);

      await expect(
        service.getConfigValue(SystemConfigKey.GLUCOSE_SAFE_MIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    it('should update config in DB and cache', async () => {
      const existing = { key: 'GLUCOSE_SAFE_MIN', value: 70 };
      const updated = {
        key: 'GLUCOSE_SAFE_MIN',
        value: 65,
        updatedBy: 'admin-id',
      };
      mockRepository.findByKey.mockResolvedValue(existing);
      mockRepository.updateByKey.mockResolvedValue(updated);

      const result = await service.updateConfig(
        'GLUCOSE_SAFE_MIN',
        { value: 65 },
        'admin-id',
      );

      expect(result).toEqual(updated);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'config_GLUCOSE_SAFE_MIN',
        65,
        0,
      );
    });

    it('should throw NotFoundException when config key does not exist', async () => {
      mockRepository.findByKey.mockResolvedValue(null);

      await expect(
        service.updateConfig('INVALID_KEY', { value: 99 }, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
