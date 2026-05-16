import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./lib/stripeClient";
import type Stripe from "stripe";
import { seedTechniciansIfEmpty, removeDemoTechnicians } from "./seed-technicians.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const webhookEndpoint = await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    // stripe-replit-sync only registers its own built-in event types, which does not
    // include account.updated. Without it, Stripe will never send the event and
    // stripeOnboardingComplete will never auto-update. Ensure it is always present.
    const REQUIRED_EVENTS = ['account.updated'];
    const enabledEvents: string[] = (webhookEndpoint.enabled_events as string[]) ?? [];

    // A wildcard endpoint already receives every event — no update needed.
    const isWildcard = enabledEvents.includes('*');
    const missingEvents = isWildcard
      ? []
      : REQUIRED_EVENTS.filter((e) => !enabledEvents.includes(e));

    if (missingEvents.length > 0) {
      logger.warn(
        { webhookId: webhookEndpoint.id, missingEvents },
        "Stripe webhook is missing required events — updating endpoint to add them",
      );
      try {
        const stripe = await getUncachableStripeClient();
        const updatedEvents = [...enabledEvents, ...missingEvents];
        await stripe.webhookEndpoints.update(webhookEndpoint.id, {
          // Stripe SDK requires a typed union for enabled_events; cast through unknown to avoid
          // manually enumerating all ~200 allowed event name literals.
          enabled_events: updatedEvents as unknown as Stripe.WebhookEndpointUpdateParams['enabled_events'],
        });
        logger.info(
          { webhookId: webhookEndpoint.id, addedEvents: missingEvents },
          "Stripe webhook updated — required events added successfully",
        );
      } catch (updateErr) {
        logger.error(
          { err: updateErr, webhookId: webhookEndpoint.id, missingEvents },
          "Failed to update Stripe webhook with required events — account.updated handler will not fire until this is resolved",
        );
      }
    } else {
      logger.info(
        { webhookId: webhookEndpoint.id, isWildcard },
        "Stripe webhook already includes all required events (account.updated)",
      );
    }

    stripeSync.syncBackfill().then(() => {
      logger.info("Stripe data backfill complete");
    }).catch((err) => {
      logger.error({ err }, "Stripe backfill error");
    });
  } catch (err) {
    logger.warn({ err }, "Stripe initialization skipped — integration not connected or setup failed");
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed and cleanup run after port opens so deployment health checks don't time out
  seedTechniciansIfEmpty()
    .then(() => removeDemoTechnicians())
    .catch((e) => logger.error({ err: e }, "Technician seed/cleanup failed"));
});
