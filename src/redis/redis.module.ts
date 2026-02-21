import { Global, Module } from '@nestjs/common';
import { RedisTestController } from './redis-test.controller';
import { RedisProvider } from './redis.provider';

@Global()
@Module({
  providers: [RedisProvider],
  controllers: [RedisTestController],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
