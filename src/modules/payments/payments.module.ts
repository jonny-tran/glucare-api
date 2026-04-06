import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { PaymentsService } from './payments.service';
import { SePayController } from './sepay.controller';
import { PaymentsRepository } from './payments.repository';

@Module({
  imports: [
    DatabaseModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL:
          configService.get<string>('SEPAY_API_URL'),
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${configService.get<string>('SEPAY_API_TOKEN')}`,
        },
      }),
    }),
  ],
  providers: [PaymentsService, PaymentsRepository],
  controllers: [SePayController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
