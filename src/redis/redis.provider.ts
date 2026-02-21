import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL')!;
    if (!redisUrl) {
      throw new Error(
        'REDIS_URL đang không được định nghĩa trong biến môi trường',
      );
    }
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: {
        rejectUnauthorized: false,
      },
    });
  },
  inject: [ConfigService],
};
