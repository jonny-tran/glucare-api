import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

export type SubscriptionTier = 'TRIAL' | 'MONTHLY' | 'YEARLY' | 'LIFETIME';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

type CreateTransactionInput = {
  id: string;
  userId: string;
  amount: string;
  transferType: 'in' | 'out';
  status: TransactionStatus;
  gateway: string | null;
  transactionContent: string | null;
  referenceCode: string | null;
  expiresAt: Date;
  cancelledAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};

type FinalizeWebhookInput = {
  webhookTransactionId: string;
  userId: string;
  amount: string;
  transferType: 'in' | 'out';
  gateway: string | null;
  transactionContent: string | null;
  referenceCode: string | null;
  paidAt: Date;
  now: Date;
  reason: string;
  oldTier: SubscriptionTier;
  oldExpiry: Date | null;
  nextTier?: SubscriptionTier;
  nextExpiry?: Date | null;
  shouldUpdateSubscription: boolean;
};

@Injectable()
export class PaymentsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createTransaction(input: CreateTransactionInput): Promise<string | null> {
    const inserted = await this.db
      .insert(schema.transactions)
      .values(input)
      .onConflictDoNothing({ target: schema.transactions.id })
      .returning({ id: schema.transactions.id });

    return inserted[0]?.id ?? null;
  }

  async existsUserById(userId: string): Promise<boolean> {
    const user = await this.db.query.users.findFirst({
      columns: { id: true },
      where: eq(schema.users.id, userId),
    });

    return Boolean(user);
  }

  async findUserSubscription(userId: string) {
    return this.db.query.users.findFirst({
      columns: {
        id: true,
        phoneNumber: true,
        role: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
      },
      where: eq(schema.users.id, userId),
    });
  }

  async findUserByPhone(phoneNumber: string) {
    return this.db.query.users.findFirst({
      columns: {
        id: true,
        phoneNumber: true,
        role: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
      },
      where: eq(schema.users.phoneNumber, phoneNumber),
    });
  }

  private async findPendingTransactionForWebhook(
    tx: NodePgDatabase<typeof schema>,
    userId: string,
    amount: string,
    now: Date,
  ) {
    const exact = await tx.query.transactions.findFirst({
      where: and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.status, 'PENDING'),
        eq(schema.transactions.amount, amount),
        gt(schema.transactions.expiresAt, now),
      ),
      orderBy: [desc(schema.transactions.createdAt)],
    });
    if (exact) return exact;

    return tx.query.transactions.findFirst({
      where: and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.status, 'PENDING'),
        gt(schema.transactions.expiresAt, now),
      ),
      orderBy: [desc(schema.transactions.createdAt)],
    });
  }

  async markPendingTransactionFailedByUser(
    userId: string,
    amount: string,
    reason: string,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const pending = await this.findPendingTransactionForWebhook(
        tx,
        userId,
        amount,
        now,
      );
      if (!pending) return false;

      await tx
        .update(schema.transactions)
        .set({
          status: 'FAILED',
          updatedAt: now,
          transactionContent: pending.transactionContent
            ? `${pending.transactionContent} | FAILED: ${reason}`
            : `FAILED: ${reason}`,
        })
        .where(eq(schema.transactions.id, pending.id));

      return true;
    });
  }

  async finalizeWebhookSuccess(input: FinalizeWebhookInput): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const pending = await this.findPendingTransactionForWebhook(
        tx,
        input.userId,
        input.amount,
        input.now,
      );

      let transactionId = pending?.id;

      if (pending) {
        await tx
          .update(schema.transactions)
          .set({
            status: 'SUCCESS',
            transferType: input.transferType,
            gateway: input.gateway,
            amount: input.amount,
            transactionContent: input.transactionContent,
            referenceCode: input.referenceCode,
            createdAt: input.paidAt,
            updatedAt: input.now,
          })
          .where(eq(schema.transactions.id, pending.id));
      } else {
        const failedInserted = await tx
          .insert(schema.transactions)
          .values({
            id: input.webhookTransactionId,
            userId: input.userId,
            amount: input.amount,
            transferType: input.transferType,
            status: 'FAILED',
            gateway: input.gateway,
            transactionContent: input.transactionContent
              ? `${input.transactionContent} | FAILED: ${input.reason}`
              : `FAILED: ${input.reason}`,
            referenceCode: input.referenceCode,
            expiresAt: input.now,
            cancelledAt: null,
            updatedAt: input.now,
            createdAt: input.paidAt,
          })
          .onConflictDoNothing({ target: schema.transactions.id })
          .returning({ id: schema.transactions.id });

        return failedInserted.length > 0;
      }

      if (!transactionId) {
        return false;
      }

      // Update subscription state when business rules require it.
      if (input.shouldUpdateSubscription && input.nextTier) {
        await tx
          .update(schema.users)
          .set({
            subscriptionTier: input.nextTier,
            subscriptionExpiry: input.nextExpiry ?? null,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, input.userId));
      }

      await tx.insert(schema.subscriptionLogs).values({
        userId: input.userId,
        transactionId,
        oldTier: input.oldTier,
        newTier: input.nextTier ?? input.oldTier,
        oldExpiry: input.oldExpiry,
        newExpiry: input.nextExpiry ?? input.oldExpiry,
        reason: input.reason,
      });

      return true;
    });
  }

  async cancelPendingTransaction(
    userId: string,
    transactionId?: string,
  ): Promise<string | null> {
    const now = new Date();

    if (transactionId) {
      const cancelled = await this.db
        .update(schema.transactions)
        .set({
          status: 'CANCELLED',
          cancelledAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.transactions.id, transactionId),
            eq(schema.transactions.userId, userId),
            eq(schema.transactions.status, 'PENDING'),
          ),
        )
        .returning({ id: schema.transactions.id });

      return cancelled[0]?.id ?? null;
    }

    const latestPending = await this.db.query.transactions.findFirst({
      where: and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.status, 'PENDING'),
      ),
      orderBy: [desc(schema.transactions.createdAt)],
    });

    if (!latestPending) return null;

    const cancelled = await this.db
      .update(schema.transactions)
      .set({
        status: 'CANCELLED',
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(schema.transactions.id, latestPending.id))
      .returning({ id: schema.transactions.id });

    return cancelled[0]?.id ?? null;
  }

  async cancelExpiredPendingTransactions(now: Date): Promise<number> {
    const cancelled = await this.db
      .update(schema.transactions)
      .set({
        status: 'CANCELLED',
        cancelledAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.transactions.status, 'PENDING'),
          lt(schema.transactions.expiresAt, now),
        ),
      )
      .returning({ id: schema.transactions.id });

    return cancelled.length;
  }
}
