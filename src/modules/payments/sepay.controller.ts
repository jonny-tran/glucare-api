import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AtGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/auth.interface';
import { PaymentsService } from './payments.service';
import { SePayTransferType, SePayWebhookDto } from './dto/sepay-webhook.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class SePayController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(AtGuard, RolesGuard)
  @Roles('PATIENT')
  @ApiOperation({
    summary:
      'Khởi tạo URL thanh toán để redirect từ Mobile sang Web Simulator',
  })
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (dto.userId !== user.sub) {
      throw new ForbiddenException('Bạn chỉ có thể khởi tạo thanh toán cho chính mình');
    }
    return this.paymentsService.initiatePayment(dto);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @UseGuards(AtGuard, RolesGuard)
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Hủy giao dịch PENDING của user',
  })
  async cancelPayment(
    @Body() dto: CancelPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.cancelPayment(user.sub, dto);
  }

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
