import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { systemConfigKeyEnum } from 'src/database/schema';
import { UpdateConfigDto } from './dto/update-config.dto';
import { SystemConfigKey } from './interfaces/system-config.interface';
import { SystemConfigRepository } from './system-config.repository';

const CACHE_PREFIX = 'config_';

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    private readonly systemConfigRepository: SystemConfigRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Bootstrap: Load toàn bộ config vào cache khi ứng dụng khởi động
   */
  async onModuleInit() {
    this.logger.log('Đang tải cấu hình hệ thống vào cache...');
    const configs = await this.systemConfigRepository.findAll();
    for (const config of configs) {
      await this.cacheManager.set(
        `${CACHE_PREFIX}${config.key}`,
        config.value,
        0, // TTL = 0 => cache vĩnh viễn
      );
    }
    this.logger.log(`Đã tải ${configs.length} cấu hình vào cache`);
  }

  /**
   * API nội bộ dùng bởi các Service khác (ví dụ GlucoseAnalyticsService)
   * Đọc cache trước, nếu miss thì query DB rồi set cache
   */
  async getConfigValue(key: SystemConfigKey): Promise<unknown> {
    const cacheKey = `${CACHE_PREFIX}${key}`;

    // 1. Kiểm tra cache
    const cachedValue = await this.cacheManager.get(cacheKey);
    if (cachedValue !== undefined && cachedValue !== null) {
      return cachedValue;
    }

    // 2. Cache miss -> query DB
    const config = await this.systemConfigRepository.findByKey(key);
    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho key: ${key}`);
    }

    // 3. Set cache rồi trả về
    await this.cacheManager.set(cacheKey, config.value, 0);
    return config.value;
  }

  /**
   * API: Lấy toàn bộ danh sách configs
   */
  async getAllConfigs() {
    return this.systemConfigRepository.findAll();
  }

  /**
   * API: Lấy chi tiết một config theo key
   */
  async getConfigByKey(key: string) {
    const config = await this.systemConfigRepository.findByKey(
      key as (typeof systemConfigKeyEnum.enumValues)[number],
    );
    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho key: ${key}`);
    }
    return config;
  }

  /**
   * API: Cập nhật config theo key
   * Side-effect: Cập nhật cache ngay lập tức
   */
  async updateConfig(key: string, dto: UpdateConfigDto, userId: string) {
    // Kiểm tra key tồn tại
    const existing = await this.systemConfigRepository.findByKey(
      key as (typeof systemConfigKeyEnum.enumValues)[number],
    );
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho key: ${key}`);
    }

    // Cập nhật DB
    const updated = await this.systemConfigRepository.updateByKey(
      key as (typeof systemConfigKeyEnum.enumValues)[number],
      dto.value,
      userId,
      dto.description,
    );

    // Cập nhật cache ngay lập tức
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await this.cacheManager.set(cacheKey, dto.value, 0);
    this.logger.log(`Đã cập nhật cache cho key: ${key}`);

    return updated;
  }
}
