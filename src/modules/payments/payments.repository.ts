import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';

type InsertTransactionInput = {
  id: string;
  userId: string;
  amount: string;
  transferType: 'in' | 'out';
  gateway: string | null;
  transactionContent: string | null;
  referenceCode: string | null;
  createdAt: Date;
};

export type SubscriptionTier = 'TRIAL' | 'MONTHLY' | 'YEARLY' | 'LIFETIME';

type ApplyPaymentInput = {
  transaction: InsertTransactionInput;
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

  async insertTransaction(input: InsertTransactionInput): Promise<boolean> {
    const inserted = await this.db
      .insert(schema.transactions)
      .values(input)
      .onConflictDoNothing({ target: schema.transactions.id })
      .returning({ id: schema.transactions.id });

    return inserted.length > 0;
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
        role: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
      },
      where: eq(schema.users.id, userId),
    });
  }

  async applyPaymentWithTransaction(input: ApplyPaymentInput): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Step 1: insert payment transaction
      const inserted = await tx
        .insert(schema.transactions)
        .values(input.transaction)
        .onConflictDoNothing({ target: schema.transactions.id })
        .returning({ id: schema.transactions.id });

      if (inserted.length === 0) {
        return false;
      }

      // Step 4: update subscription (only when needed)
      if (input.shouldUpdateSubscription && input.nextTier) {
        await tx
          .update(schema.users)
          .set({
            subscriptionTier: input.nextTier,
            subscriptionExpiry: input.nextExpiry ?? null,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, input.transaction.userId));
      }

      return true;
    });
  }
}
