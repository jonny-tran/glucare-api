import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { SePayTransferType, SePayWebhookDto } from './dto/sepay-webhook.dto';

@ApiTags('Payments')
@Controller('payments')
export class SePayController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SePay webhook endpoint' })
  async handleWebhook(
    @Body() payload: SePayWebhookDto,
    @Res() response: Response,
  ) {
    if (payload.transferType === SePayTransferType.IN) {
      await this.paymentsService.persistWebhookTransaction(payload);
    }

    return response.status(HttpStatus.OK).json({ success: true });
  }
}
