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
  profilesTable,
  pushTokensTable,
  usersTable,
} from '@workspace/db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { logger } from './logger';
import { sendEmail, emailTipConfirmed } from './mailer';

async function getTechnicianEmail(technicianId: number): Promise<{ email: string | null; name: string }> {
  const [tech] = await db
    .select({ userId: techniciansTable.userId, fullName: techniciansTable.fullName })
    .from(techniciansTable)
    .where(eq(techniciansTable.id, technicianId));
  if (!tech?.userId) return { email: null, name: '' };
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, tech.userId));
  return { email: user?.email ?? null, name: tech.fullName ?? '' };
}

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
async function sendTipPaymentNotification(
  technicianId: number,
  customerName: string,
  tipAmount: number,
): Promise<void> {
  // Look up the technician's userId to find their profileId.
  const [tech] = await db
    .select({ userId: techniciansTable.userId })
    .from(techniciansTable)
    .where(eq(techniciansTable.id, technicianId));
  if (!tech?.userId) return;

  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.userId, tech.userId));
  if (!profile) return;

  const tokens = await db
    .select({ token: pushTokensTable.token })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.profileId, profile.id));
  if (tokens.length === 0) return;

  const formattedAmount = tipAmount.toFixed(2).replace(/\.00$/, '');
  const body = `Your $${formattedAmount} tip from ${customerName} was received!`;

  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'default' as const,
    title: 'Tip payment confirmed 💵',
    body,
    data: { technicianId },
  }));

  try {
    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    // Prune tokens that Expo reports as invalid/unregistered.
    if (pushRes.ok) {
      const json = (await pushRes.json()) as {
        data?: Array<{ status: string; details?: { error?: string } }>;
      };
      const staleTokens: string[] = [];
      (json.data ?? []).forEach((ticket, i) => {
        if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          const staleToken = tokens[i]?.token;
          if (staleToken) staleTokens.push(staleToken);
        }
      });
      if (staleTokens.length > 0) {
        await db
          .delete(pushTokensTable)
          .where(
            and(
              eq(pushTokensTable.profileId, profile.id),
              sql`${pushTokensTable.token} = ANY(${staleTokens})`,
            ),
          );
      }
    }
  } catch (err) {
    logger.warn({ err, technicianId }, 'Failed to send tip payment push notification');
  }
}

export async function applyPaymentSuccess(params: PaymentSuccessParams): Promise<boolean> {
  const { thankMessageId, paymentIntentId, technicianId, jobId } = params;

  // Idempotency guard: update only when NOT already succeeded.
  // Also returns the stored tipAmount and customerName so we use the DB values for downstream accounting.
  const updated = await db
    .update(thankMessagesTable)
    .set({ paymentStatus: 'succeeded', stripePaymentIntentId: paymentIntentId })
    .where(and(
      eq(thankMessagesTable.id, thankMessageId),
      ne(thankMessagesTable.paymentStatus, 'succeeded'),
    ))
    .returning({ id: thankMessagesTable.id, tipAmount: thankMessagesTable.tipAmount, customerName: thankMessagesTable.customerName, customerId: thankMessagesTable.customerId });

  if (updated.length === 0) {
    logger.info({ thankMessageId }, 'applyPaymentSuccess: already processed, skipping side effects');
    return false;
  }

  // Use DB-stored tipAmount as the authoritative value for earnings — not caller/metadata values
  const tipAmount = parseFloat(updated[0].tipAmount ?? '0');
  const customerName = updated[0].customerName ?? 'A customer';
  const customerProfileId = updated[0].customerId ?? null;

  // Credit technician earnings and award tip points
  if (tipAmount > 0) {
    // Recompute totalEarned in a single UPDATE … SET col = (subquery) statement.
    // Postgres evaluates the subquery and applies the write atomically, closing the
    // SELECT-then-UPDATE race window that a two-step approach would leave open.
    // The thank_messages row was already flipped to 'succeeded' above, so the SUM
    // includes the current tip. Any prior drift is reconciled here automatically.
    await db
      .update(techniciansTable)
      .set({
        totalEarned: sql<string>`(
          SELECT COALESCE(SUM(${thankMessagesTable.tipAmount}), 0)
          FROM ${thankMessagesTable}
          WHERE ${thankMessagesTable.technicianId} = ${technicianId}
            AND ${thankMessagesTable.paymentStatus} = 'succeeded'
        )`,
      })
      .where(eq(techniciansTable.id, technicianId));

    await awardPoints(technicianId, 100, 'tip_received', jobId, 'Received a tip');
    // Small customer reward for including a tip
    if (customerProfileId) {
      await awardPoints(customerProfileId, 10, 'tip_sent', jobId, 'Included a tip');
    }

    // Fire push notification to the technician asynchronously — don't block the main flow.
    sendTipPaymentNotification(technicianId, customerName, tipAmount)
      .catch((err) => logger.warn({ err, technicianId }, 'Failed to send tip payment push notification'));

    // Send tip confirmed email to the technician (fire-and-forget)
    getTechnicianEmail(technicianId).then(({ email, name }) => {
      if (!email) return;
      const tpl = emailTipConfirmed({
        technicianName: name,
        customerName,
        tipAmount,
        netAmount: tipAmount * 0.91,
      });
      sendEmail(email, tpl.subject, tpl.html).catch(() => {});
    }).catch(() => {});
  }

  // Mark job as thanked (with payment) and set completion timestamp
  await db
    .update(jobsTable)
    .set({ status: 'thanked', completedAt: new Date() })
    .where(eq(jobsTable.id, jobId));

  logger.info({ thankMessageId, technicianId, tipAmount }, 'Payment success side effects applied');
  return true;
}
