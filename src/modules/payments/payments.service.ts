import {
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '../../database/schema';
import { SePayQueryDto } from './dto/sepay-query.dto';
import { PaymentsRepository, SubscriptionTier } from './payments.repository';
import { SePayWebhookDto } from './dto/sepay-webhook.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';

type PackageCode = 'M' | 'Y' | 'L';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async getTransactions(params: SePayQueryDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/transactions', {
          headers: {
            Authorization: `Bearer ${this.getApiToken()}`,
          },
          params,
        }),
      );

      return response.data;
    } catch (error) {
      this.handleSePayApiError(error, 'getTransactions');
    }
  }

  async getTransactionDetail(id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/transactions/${id}`, {
          headers: {
            Authorization: `Bearer ${this.getApiToken()}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleSePayApiError(error, 'getTransactionDetail');
    }
  }

  async initiatePayment(dto: InitiatePaymentDto): Promise<{
    paymentUrl: string;
    transactionId: string;
    expiresAt: string;
  }> {
    try {
      const user = await this.paymentsRepository.findUserSubscription(dto.userId);
      if (!user) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }

      const simulatorUrl = this.resolvePaymentSimulatorUrl();
      const transactionId = randomUUID();
      const expectedAmount = this.resolveExpectedAmountByPackage(dto.packageType);
      const now = new Date();
      const expiresAt = dayjs(now).add(5, 'minute').toDate();

      await this.paymentsRepository.createTransaction({
        id: transactionId,
        userId: dto.userId,
        amount: expectedAmount,
        transferType: 'in',
        status: 'PENDING',
        gateway: null,
        transactionContent: `PENDING ${dto.packageType}`,
        referenceCode: null,
        expiresAt,
        cancelledAt: null,
        updatedAt: now,
        createdAt: now,
      });

      const paymentUrl = `${simulatorUrl}?userId=${encodeURIComponent(dto.userId)}&package=${encodeURIComponent(dto.packageType)}&transactionId=${encodeURIComponent(transactionId)}`;
      return {
        paymentUrl,
        transactionId,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to initiate payment for user ${dto.userId}: ${String(error)}`,
      );
      throw new InternalServerErrorException('Failed to initiate payment');
    }
  }

  private resolvePaymentSimulatorUrl(): string {
    const rawGatewayUrl = this.configService.get<string>('URL_PAYMENTS_GATEWAY');
    if (!rawGatewayUrl) {
      throw new ServiceUnavailableException(
        'URL_PAYMENTS_GATEWAY is not configured',
      );
    }

    const base = rawGatewayUrl.replace(/\/+$/, '');

    // If env already points to a specific path, normalize it to new /payment route.
    if (base.includes('/payment/simulator')) {
      return base.replace('/payment/simulator', '/payment');
    }
    if (base.includes('/dev/payments')) {
      return base.replace('/dev/payments', '/payment');
    }
    if (base.endsWith('/payment')) {
      return base;
    }

    return `${base}/payment`;
  }

  parseUserIdFromContent(content: string): string | null {
    if (!content) return null;
    const regex =
      /GLUCARE[ _]([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})/i;
    const match = content.match(regex);
    return match?.[1] ?? null;
  }

  parsePackageCodeFromContent(content: string): PackageCode | null {
    if (!content) return null;
    const match = content.trim().match(/\b([MYL])\b\s*$/i);
    if (!match?.[1]) return null;
    return match[1].toUpperCase() as PackageCode;
  }

  parsePhoneFromContent(content: string): string | null {
    if (!content) return null;
    const match = content.trim().match(/GLUCARE[ _]([0-9]{9,11})/i);
    return match?.[1] ?? null;
  }

  async persistWebhookTransaction(payload: SePayWebhookDto) {
    const content = payload.content ?? '';
    const phone = this.parsePhoneFromContent(content);
    if (!phone) {
      this.logger.warn(
        `Skip SePay transaction ${payload.id}: cannot parse phone number`,
      );
      return false;
    }

    const user = await this.paymentsRepository.findUserByPhone(phone);
    if (!user) {
      this.logger.warn(
        `Skip SePay transaction ${payload.id}: user with phone ${phone} does not exist`,
      );
      return false;
    }

    const userId = user.id;
    const packageCode = this.parsePackageCodeFromContent(content);
    const now = dayjs();
    const oldTier = (user.subscriptionTier ?? 'TRIAL') as SubscriptionTier;
    const oldExpiry = user.subscriptionExpiry ?? null;

    let shouldUpdateSubscription = false;
    let nextTier: SubscriptionTier | undefined;
    let nextExpiry: Date | null | undefined;

    if (user.role === UserRole.PATIENT) {
      const currentTier = (user.subscriptionTier ?? 'TRIAL') as SubscriptionTier;

      if (currentTier === 'LIFETIME') {
        // Enforce invariant: LIFETIME users must always have null expiry.
        if (user.subscriptionExpiry) {
          shouldUpdateSubscription = true;
          nextTier = 'LIFETIME';
          nextExpiry = null;
        }
        this.logger.log(
          `User ${userId} đã ở gói LIFETIME, bỏ qua cập nhật expiry cho giao dịch ${payload.id}`,
        );
      } else if (packageCode === 'L') {
        shouldUpdateSubscription = true;
        nextTier = 'LIFETIME';
        nextExpiry = null;
      } else if (packageCode === 'M' || packageCode === 'Y') {
        const currentExpiry = user.subscriptionExpiry
          ? dayjs(user.subscriptionExpiry)
          : null;
        const startFrom =
          currentExpiry && currentExpiry.isAfter(now) ? currentExpiry : now;
        const days = packageCode === 'M' ? 30 : 365;

        shouldUpdateSubscription = true;
        nextTier = packageCode === 'M' ? 'MONTHLY' : 'YEARLY';
        nextExpiry = startFrom.add(days, 'day').toDate();
      } else {
        await this.paymentsRepository.markPendingTransactionFailedByUser(
          userId,
          payload.transferAmount.toString(),
          'Invalid package code in transfer content',
        );
        this.logger.warn(
          `Transaction ${payload.id} parsed user ${userId} but no package code (M/Y/L), save transaction only`,
        );
        return false;
      }
    }

    const inserted = await this.paymentsRepository.finalizeWebhookSuccess({
      webhookTransactionId: payload.id,
      userId,
      amount: payload.transferAmount.toString(),
      transferType: payload.transferType,
      gateway: payload.gateway ?? null,
      transactionContent: payload.content ?? null,
      referenceCode: payload.referenceCode ?? null,
      paidAt: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
      now: new Date(),
      reason: `Nạp gói ${packageCode} qua ${payload.gateway ?? 'UNKNOWN_GATEWAY'}`,
      oldTier,
      oldExpiry,
      shouldUpdateSubscription,
      nextTier,
      nextExpiry,
    });

    if (inserted) {
      this.logger.log(`Saved SePay transaction ${payload.id} for user ${userId}`);
      if (shouldUpdateSubscription && nextTier) {
        this.logger.log(`User ${userId} đã nâng cấp thành công gói ${nextTier}`);
      }
    }

    return inserted;
  }

  async cancelPayment(userId: string, dto: CancelPaymentDto) {
    const cancelledId = await this.paymentsRepository.cancelPendingTransaction(
      userId,
      dto.transactionId,
    );

    if (!cancelledId) {
      throw new BadRequestException('Không tìm thấy giao dịch PENDING để hủy');
    }

    this.logger.log(`User ${userId} cancelled transaction ${cancelledId}`);
    return { transactionId: cancelledId, status: 'CANCELLED' as const };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCancelExpiredPendingTransactions() {
    const cancelledCount =
      await this.paymentsRepository.cancelExpiredPendingTransactions(new Date());
    if (cancelledCount > 0) {
      this.logger.log(`Auto-cancelled ${cancelledCount} expired pending transaction(s)`);
    }
  }

  private resolveExpectedAmountByPackage(packageType: PackageCode): string {
    const keyMap: Record<PackageCode, string> = {
      M: 'PAYMENT_PRICE_M',
      Y: 'PAYMENT_PRICE_Y',
      L: 'PAYMENT_PRICE_L',
    };
    const raw = this.configService.get<string>(keyMap[packageType]);
    if (!raw) return '0';

    const normalized = Number(raw);
    return Number.isFinite(normalized) && normalized >= 0
      ? normalized.toString()
      : '0';
  }

  private getApiToken(): string {
    const token = this.configService.get<string>('SEPAY_API_TOKEN');
    if (!token) {
      throw new ServiceUnavailableException('SEPAY_API_TOKEN is not configured');
    }
    return token;
  }

  private handleSePayApiError(error: unknown, action: string): never {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data;

      if (status === 401 || status === 429) {
        this.logger.error(
          `[SePay ${action}] status=${status} body=${JSON.stringify(responseData)}`,
        );
      } else {
        this.logger.error(
          `[SePay ${action}] unexpected error: ${error.message}`,
          error.stack,
        );
      }

      if (status) {
        throw new HttpException(
          responseData ?? 'SePay API request failed',
          status as HttpStatus,
        );
      }
    }

    this.logger.error(`[SePay ${action}] unknown error`, String(error));
    throw new ServiceUnavailableException('Cannot connect to SePay API');
  }
}
