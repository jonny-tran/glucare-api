import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

@ApiTags('System Test')
@Controller('redis-test')
export class RedisTestController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Get('hello')
  @ApiOperation({ summary: 'Kiểm tra kết nối Upstash Redis' })
  async testRedis(@Query('msg') msg: string = 'Hello Gluecare') {
    const key = 'test_key';

    await this.redis.set(key, msg, 'EX', 60);

    const storedValue = await this.redis.get(key);

    return {
      status: 'Connected to Upstash!',
      sent: msg,
      received: storedValue,
      matching: msg === storedValue,
    };
  }
}
