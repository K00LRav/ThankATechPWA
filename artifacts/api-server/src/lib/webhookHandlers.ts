import { getStripeSync } from './stripeClient';
import { db } from '@workspace/db';
import { thankMessagesTable, techniciansTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { logger } from './logger';
import { applyPaymentSuccess } from './applyPaymentSuccess';

interface StripeEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    // stripe-replit-sync verifies the signature and stores event data in stripe schema
    await sync.processWebhook(payload, signature);

    // Since processWebhook did not throw, the signature is valid — safe to parse for app logic
    let event: StripeEvent;
    try {
      event = JSON.parse(payload.toString()) as StripeEvent;
    } catch {
      logger.error('Failed to parse Stripe event payload as JSON');
      return;
    }

    await WebhookHandlers.handleApplicationEvent(event);
  }

  static async handleApplicationEvent(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as {
          id?: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          details_submitted?: boolean;
          disabled_reason?: string | null;
        };

        const stripeAccountId = account.id;
        if (!stripeAccountId) {
          logger.warn('account.updated: missing account id, skipping');
          break;
        }

        // A Stripe account is considered fully active only when all three conditions hold.
        // Any restriction (fraud review, document request, payout suspension) flips the flag to false,
        // which causes /stripe/payment-intent to block new tips until the account is restored.
        const isFullyActive =
          account.details_submitted === true &&
          account.charges_enabled === true &&
          account.payouts_enabled === true;

        const [tech] = await db
          .select({ id: techniciansTable.id, stripeOnboardingComplete: techniciansTable.stripeOnboardingComplete })
          .from(techniciansTable)
          .where(eq(techniciansTable.stripeAccountId, stripeAccountId));

        if (!tech) {
          logger.warn({ stripeAccountId }, 'account.updated: no technician found for Stripe account, skipping');
          break;
        }

        if (tech.stripeOnboardingComplete !== isFullyActive) {
          await db
            .update(techniciansTable)
            .set({ stripeOnboardingComplete: isFullyActive })
            .where(eq(techniciansTable.stripeAccountId, stripeAccountId));

          logger.info(
            { technicianId: tech.id, stripeAccountId, isFullyActive, disabledReason: account.disabled_reason ?? null },
            isFullyActive
              ? 'account.updated: Stripe account re-enabled — stripeOnboardingComplete set to true'
              : 'account.updated: Stripe account disabled/restricted — stripeOnboardingComplete flipped to false',
          );
        } else {
          logger.info(
            { technicianId: tech.id, stripeAccountId, isFullyActive },
            'account.updated: stripeOnboardingComplete unchanged, no DB update needed',
          );
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as {
          id?: string;
          metadata?: {
            thankMessageId?: string;
            technicianId?: string;
            jobId?: string;
            tipAmount?: string;
          };
        };

        const rawThankMessageId = pi.metadata?.thankMessageId;
        const thankMessageId = rawThankMessageId ? parseInt(rawThankMessageId, 10) : NaN;

        if (!thankMessageId || isNaN(thankMessageId)) {
          logger.warn({ piId: pi.id }, 'payment_intent.succeeded: no thankMessageId in metadata, skipping');
          break;
        }

        const rawTechnicianId = pi.metadata?.technicianId;
        const technicianId = rawTechnicianId ? parseInt(rawTechnicianId, 10) : NaN;
        const rawJobId = pi.metadata?.jobId;
        const jobId = rawJobId ? parseInt(rawJobId, 10) : NaN;
        const tipAmount = parseFloat(pi.metadata?.tipAmount ?? '0');

        if (isNaN(technicianId) || isNaN(jobId)) {
          logger.warn({ piId: pi.id, thankMessageId }, 'payment_intent.succeeded: missing technicianId or jobId in metadata');
          break;
        }

        // Funds are routed to the technician's connected Stripe account automatically via
        // the `transfer_data.destination` set on the PaymentIntent at creation time.
        // Stripe transfers (tipAmount - application_fee) = tipAmount * 0.91 to the technician.
        // No explicit Stripe Transfer object needs to be created here — destination charges
        // handle this atomically. Creating a separate Transfer would double-pay the technician.
        logger.info(
          { piId: pi.id, thankMessageId, technicianId, tipAmount, netToTech: Math.round(tipAmount * 0.91 * 100) / 100 },
          'payment_intent.succeeded: Stripe destination charge — funds transferred to technician connected account (91% of tip)',
        );

        await applyPaymentSuccess({
          thankMessageId,
          paymentIntentId: pi.id ?? '',
          technicianId,
          jobId,
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as {
          id?: string;
          metadata?: { thankMessageId?: string };
        };

        const rawThankMessageId = pi.metadata?.thankMessageId;
        const thankMessageId = rawThankMessageId ? parseInt(rawThankMessageId, 10) : NaN;

        if (!thankMessageId || isNaN(thankMessageId)) {
          logger.warn({ piId: pi.id }, 'payment_intent.payment_failed: no thankMessageId in metadata, skipping');
          break;
        }

        await db
          .update(thankMessagesTable)
          .set({ paymentStatus: 'failed' })
          .where(eq(thankMessagesTable.id, thankMessageId));

        logger.info({ thankMessageId, piId: pi.id }, 'Thank message payment marked failed via webhook');
        break;
      }

      default:
        break;
    }
  }
}
