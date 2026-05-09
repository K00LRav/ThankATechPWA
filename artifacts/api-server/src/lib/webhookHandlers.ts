import { getStripeSync } from './stripeClient';
import { db } from '@workspace/db';
import { thankMessagesTable } from '@workspace/db';
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

    switch (event.type) {
      case 'payment_intent.succeeded': {
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
          'payment_intent.succeeded: Stripe destination charge — %.2f transferred to technician connected account (91% of tip)',
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
