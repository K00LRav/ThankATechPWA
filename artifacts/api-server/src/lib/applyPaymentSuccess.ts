/**
 * Shared idempotent handler for Stripe payment_intent.succeeded.
 * Called by both the webhook handler AND the /stripe/payment-complete endpoint
 * to ensure full side-effect parity regardless of which path completes first.
 *
 * Idempotency is enforced at the DB level: we only update thank_messages when
 * paymentStatus is NOT already 'succeeded'. If 0 rows are updated the payment
 * was already processed and we bail out early — preventing double-crediting.
 */

import { db } from '@workspace/db';
import {
  thankMessagesTable,
  techniciansTable,
  jobsTable,
  pointsTable,
  pointTransactionsTable,
} from '@workspace/db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { logger } from './logger';

async function awardPoints(
  userId: number,
  amount: number,
  type: string,
  jobId: number,
  description: string,
): Promise<void> {
  await db
    .insert(pointsTable)
    .values({ userId, balance: amount })
    .onConflictDoUpdate({
      target: pointsTable.userId,
      set: { balance: sql`${pointsTable.balance} + ${amount}`, updatedAt: new Date() },
    });

  await db.insert(pointTransactionsTable).values({
    userId,
    amount,
    type,
    jobId,
    description,
  });
}

export interface PaymentSuccessParams {
  thankMessageId: number;
  paymentIntentId: string;
  technicianId: number;
  jobId: number;
}

/**
 * Returns true if side effects were applied (first time), false if already processed.
 *
 * tipAmount is read from the DB (thank_messages.tipAmount) — never from caller-supplied
 * or PI metadata values — ensuring a single authoritative source for earnings accounting.
 */
export async function applyPaymentSuccess(params: PaymentSuccessParams): Promise<boolean> {
  const { thankMessageId, paymentIntentId, technicianId, jobId } = params;

  // Idempotency guard: update only when NOT already succeeded.
  // Also returns the stored tipAmount so we use the DB value for downstream accounting.
  const updated = await db
    .update(thankMessagesTable)
    .set({ paymentStatus: 'succeeded', stripePaymentIntentId: paymentIntentId })
    .where(and(
      eq(thankMessagesTable.id, thankMessageId),
      ne(thankMessagesTable.paymentStatus, 'succeeded'),
    ))
    .returning({ id: thankMessagesTable.id, tipAmount: thankMessagesTable.tipAmount });

  if (updated.length === 0) {
    logger.info({ thankMessageId }, 'applyPaymentSuccess: already processed, skipping side effects');
    return false;
  }

  // Use DB-stored tipAmount as the authoritative value for earnings — not caller/metadata values
  const tipAmount = parseFloat(updated[0].tipAmount ?? '0');

  // Credit technician earnings and award tip points
  if (tipAmount > 0) {
    await db
      .update(techniciansTable)
      .set({ totalEarned: sql`${techniciansTable.totalEarned} + ${tipAmount.toString()}` })
      .where(eq(techniciansTable.id, technicianId));

    await awardPoints(technicianId, 50, 'tip_received', jobId, 'Received a tip');
  }

  // Mark job as thanked (with payment) and set completion timestamp
  await db
    .update(jobsTable)
    .set({ status: 'thanked', completedAt: new Date() })
    .where(eq(jobsTable.id, jobId));

  logger.info({ thankMessageId, technicianId, tipAmount }, 'Payment success side effects applied');
  return true;
}
