import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import { firstValueFrom } from 'rxjs';
import { UserRole } from '../../database/schema';
import { SePayQueryDto } from './dto/sepay-query.dto';
import { PaymentsRepository, SubscriptionTier } from './payments.repository';
import { SePayWebhookDto } from './dto/sepay-webhook.dto';

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

  async persistWebhookTransaction(payload: SePayWebhookDto) {
    const content = payload.content ?? '';
    const userId = this.parseUserIdFromContent(content);
    if (!userId) {
      this.logger.warn(`Skip SePay transaction ${payload.id}: cannot parse user id`);
      return false;
    }

    const user = await this.paymentsRepository.findUserSubscription(userId);
    if (!user) {
      this.logger.warn(
        `Skip SePay transaction ${payload.id}: user ${userId} does not exist`,
      );
      return false;
    }

    const packageCode = this.parsePackageCodeFromContent(content);
    const now = dayjs();

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
        this.logger.warn(
          `Transaction ${payload.id} parsed user ${userId} but no package code (M/Y/L), save transaction only`,
        );
      }
    }

    const inserted = await this.paymentsRepository.applyPaymentWithTransaction({
      transaction: {
        id: payload.id,
        userId,
        amount: payload.transferAmount.toString(),
        transferType: payload.transferType,
        gateway: payload.gateway ?? null,
        transactionContent: payload.content ?? null,
        referenceCode: payload.referenceCode ?? null,
        createdAt: payload.transactionDate
          ? new Date(payload.transactionDate)
          : new Date(),
      },
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
