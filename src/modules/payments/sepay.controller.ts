import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { SePayTransferType, SePayWebhookDto } from './dto/sepay-webhook.dto';

@ApiTags('Payments')
@Controller('payments')
export class SePayController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SePay webhook endpoint' })
  async handleWebhook(
    @Body() payload: SePayWebhookDto,
    @Headers('x-api-key') apiKey: string,
    @Res() response: Response,
  ) {
    const expectedApiKey = this.configService.get<string>('SEPAY_WEBHOOK_API_KEY');
    if (!expectedApiKey) {
      throw new ServiceUnavailableException('SEPAY_WEBHOOK_API_KEY is not configured');
    }
    if (!apiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid SePay webhook api key');
    }

    if (payload.transferType === SePayTransferType.IN) {
      await this.paymentsService.persistWebhookTransaction(payload);
    }

    return response.status(HttpStatus.OK).json({ success: true });
  }
}
