import { Router } from "express";
import { db } from "@workspace/db";
import { techniciansTable, thankMessagesTable, profilesTable, jobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripeClient";
import { applyPaymentSuccess } from "../lib/applyPaymentSuccess";

const router = Router();

async function getTechnicianIdForUser(userId: string): Promise<number | null> {
  const [tech] = await db
    .select({ id: techniciansTable.id })
    .from(techniciansTable)
    .where(eq(techniciansTable.userId, userId));
  return tech?.id ?? null;
}

router.get("/stripe/config", async (req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    return res.json({ publishableKey });
  } catch (err) {
    req.log.error({ err }, "Failed to get Stripe config");
    return res.status(503).json({ error: "Stripe not configured" });
  }
});

router.post("/stripe/connect/onboard", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const technicianId = await getTechnicianIdForUser(req.user.id);
    if (!technicianId) {
      return res.status(404).json({ error: "Technician profile not found" });
    }

    const [tech] = await db
      .select()
      .from(techniciansTable)
      .where(eq(techniciansTable.id, technicianId));

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const stripe = await getUncachableStripeClient();

    let accountId = tech.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { technicianId: String(technicianId) },
      });
      accountId = account.id;
      await db
        .update(techniciansTable)
        .set({ stripeAccountId: accountId })
        .where(eq(techniciansTable.id, technicianId));
    }

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/technician/dashboard?stripe=refresh`,
      return_url: `${baseUrl}/technician/dashboard?stripe=success`,
      type: "account_onboarding",
    });

    return res.json({ url: accountLink.url });
  } catch (err) {
    req.log.error({ err }, "Error creating Stripe Connect onboarding link");
    return res.status(500).json({ error: "Failed to create onboarding link" });
  }
});

router.get("/stripe/connect/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const technicianId = await getTechnicianIdForUser(req.user.id);
    if (!technicianId) {
      return res.status(404).json({ error: "Technician profile not found" });
    }

    const [tech] = await db
      .select()
      .from(techniciansTable)
      .where(eq(techniciansTable.id, technicianId));

    if (!tech?.stripeAccountId) {
      return res.json({ connected: false, onboardingComplete: false, accountId: null });
    }

    if (tech.stripeOnboardingComplete) {
      return res.json({ connected: true, onboardingComplete: true, accountId: tech.stripeAccountId });
    }

    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(tech.stripeAccountId);
    const onboardingComplete = account.details_submitted
      && (account.charges_enabled ?? false)
      && (account.payouts_enabled ?? false);

    if (onboardingComplete && !tech.stripeOnboardingComplete) {
      await db
        .update(techniciansTable)
        .set({ stripeOnboardingComplete: true })
        .where(eq(techniciansTable.id, technicianId));
    }

    return res.json({
      connected: true,
      onboardingComplete,
      accountId: tech.stripeAccountId,
    });
  } catch (err) {
    req.log.error({ err }, "Error checking Stripe Connect status");
    return res.status(500).json({ error: "Failed to check Stripe status" });
  }
});

/**
 * POST /stripe/retry-payment
 * Creates a fresh PaymentIntent for a thank message whose previous payment failed.
 * The existing thank message (message already sent) is reused — no new message is created.
 */
router.post("/stripe/retry-payment", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { thankMessageId } = req.body as { thankMessageId: number };

    if (!thankMessageId) {
      return res.status(400).json({ error: "thankMessageId is required" });
    }

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile) {
      return res.status(403).json({ error: "Profile not found" });
    }

    const [thankMessage] = await db
      .select()
      .from(thankMessagesTable)
      .where(eq(thankMessagesTable.id, thankMessageId));

    if (!thankMessage || thankMessage.customerId !== profile.id) {
      return res.status(403).json({ error: "Thank message not found or not owned by you" });
    }

    // Only failed payments can be retried. Pending means a Stripe PI is still active —
    // creating another one without canceling the existing one risks a double charge.
    if (thankMessage.paymentStatus !== "failed") {
      return res.status(400).json({
        error: `Cannot retry: payment status is '${thankMessage.paymentStatus}'. Only payments with a 'failed' status can be retried.`,
      });
    }

    const tipAmount = parseFloat(thankMessage.tipAmount ?? "0");
    if (tipAmount <= 0) {
      return res.status(400).json({ error: "This thank message has no tip to charge" });
    }

    const amountCents = Math.round(tipAmount * 100);
    if (amountCents < 50) {
      return res.status(400).json({ error: "Minimum tip is $0.50" });
    }

    const [tech] = await db
      .select()
      .from(techniciansTable)
      .where(eq(techniciansTable.id, thankMessage.technicianId));

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    if (!tech.stripeAccountId || !tech.stripeOnboardingComplete) {
      return res.status(402).json({
        error: "This technician has not set up their payout account yet and cannot accept tips at this time.",
      });
    }

    const stripe = await getUncachableStripeClient();
    const platformFeePercent = 0.09;
    const applicationFeeAmount = Math.round(amountCents * platformFeePercent);

    // Use a time-based suffix so each retry gets a fresh idempotency key,
    // avoiding the cached (failed) PaymentIntent from the original attempt.
    const retryKey = `pi-thankmsg-${thankMessageId}-retry-${Date.now()}`;
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          technicianId: String(thankMessage.technicianId),
          thankMessageId: String(thankMessageId),
          customerId: String(profile.id),
          jobId: String(thankMessage.jobId),
          tipAmount: String(tipAmount),
        },
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: tech.stripeAccountId },
      },
      { idempotencyKey: retryKey },
    );

    // Only update the stored PI id — intentionally do NOT change paymentStatus here.
    // The status stays "failed" (or "pending" for recovery) until payment-complete or the
    // Stripe webhook fires payment_intent.succeeded. This keeps the "payment failed" badge
    // visible on the dashboard the entire time the customer is filling in the payment form,
    // so if they abandon mid-retry they can still find their way back.
    await db
      .update(thankMessagesTable)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(thankMessagesTable.id, thankMessageId));

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectedToStripe: true,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating retry payment intent");
    return res.status(500).json({ error: "Failed to create retry payment intent" });
  }
});

router.post("/stripe/payment-intent", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { thankMessageId } = req.body as {
      thankMessageId: number;
      amount?: number; // accepted from client but NOT used for charge amount — DB value is authoritative
    };

    if (!thankMessageId) {
      return res.status(400).json({ error: "thankMessageId is required" });
    }

    // Verify the thank message exists and belongs to the authenticated user's customer profile
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile) {
      return res.status(403).json({ error: "Profile not found" });
    }

    const [thankMessage] = await db
      .select()
      .from(thankMessagesTable)
      .where(eq(thankMessagesTable.id, thankMessageId));

    if (!thankMessage || thankMessage.customerId !== profile.id) {
      return res.status(403).json({ error: "Thank message not found or not owned by you" });
    }

    // Prevent duplicate charges: refuse a new PI if one is already pending or succeeded
    if (thankMessage.paymentStatus === "pending" || thankMessage.paymentStatus === "succeeded") {
      return res.status(409).json({
        error: "A payment for this thank message is already in progress or completed.",
      });
    }

    // Derive technicianId and tip amount strictly from the persisted thank message
    // — never trust client-supplied values for financial operations
    const technicianId = thankMessage.technicianId;
    const tipAmount = parseFloat(thankMessage.tipAmount ?? "0");

    if (tipAmount <= 0) {
      return res.status(400).json({ error: "This thank message has no tip to charge" });
    }

    const amountCents = Math.round(tipAmount * 100);
    if (amountCents < 50) {
      return res.status(400).json({ error: "Minimum tip is $0.50" });
    }

    const [tech] = await db
      .select()
      .from(techniciansTable)
      .where(eq(techniciansTable.id, technicianId));

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    // Require technician to have completed Stripe Connect onboarding before accepting tips.
    // This ensures funds are always routed to the technician's bank account.
    if (!tech.stripeAccountId || !tech.stripeOnboardingComplete) {
      return res.status(402).json({
        error: "This technician has not set up their payout account yet and cannot accept tips at this time.",
      });
    }

    const stripe = await getUncachableStripeClient();

    const platformFeePercent = 0.09;
    const applicationFeeAmount = Math.round(amountCents * platformFeePercent);

    // Critical payout path: transfer_data.destination MUST always be set so Stripe
    // automatically routes net funds (~91%) to the technician's connected account on charge success.
    // This is validated above (stripeAccountId + stripeOnboardingComplete), but we guard
    // defensively here too — a missing destination would charge the customer without paying out.
    if (!tech.stripeAccountId) {
      req.log.error({ technicianId, thankMessageId }, "stripeAccountId is null at PaymentIntent creation — aborting to prevent loss of funds");
      return res.status(500).json({ error: "Technician payout account is not configured" });
    }

    const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        technicianId: String(technicianId),
        thankMessageId: String(thankMessageId),
        customerId: String(profile.id),
        jobId: String(thankMessage.jobId),
        // tipAmount in metadata mirrors the DB value — used by webhook for earnings credit
        tipAmount: String(tipAmount),
      },
      // application_fee_amount: platform keeps 9% of the tip
      // transfer_data.destination: Stripe atomically transfers the remaining 91% to the
      // technician's connected account when the charge succeeds — no separate Transfer needed.
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: tech.stripeAccountId },
    };

    // Idempotency key scoped to this thank message — prevents duplicate Stripe charges on client retries
    const idempotencyKey = `pi-thankmsg-${thankMessageId}`;
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, { idempotencyKey });

    // Immediately record the payment intent ID and set status to pending
    await db
      .update(thankMessagesTable)
      .set({ stripePaymentIntentId: paymentIntent.id, paymentStatus: "pending" })
      .where(eq(thankMessagesTable.id, thankMessageId));

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectedToStripe: !!(tech.stripeAccountId && tech.stripeOnboardingComplete),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating payment intent");
    return res.status(500).json({ error: "Failed to create payment intent" });
  }
});

/**
 * POST /stripe/payment-cancel
 * Cancels a pending payment intent and resets the thank message payment status to 'none'.
 * Used when a customer chooses to skip payment after a PI was already created.
 */
router.post("/stripe/payment-cancel", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { thankMessageId } = req.body as { thankMessageId: number };

    if (!thankMessageId) {
      return res.status(400).json({ error: "thankMessageId is required" });
    }

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile) {
      return res.status(403).json({ error: "Profile not found" });
    }

    const [thankMessage] = await db
      .select()
      .from(thankMessagesTable)
      .where(eq(thankMessagesTable.id, thankMessageId));

    if (!thankMessage || thankMessage.customerId !== profile.id) {
      return res.status(403).json({ error: "Thank message not found or not owned by you" });
    }

    if (thankMessage.paymentStatus === "succeeded") {
      return res.status(409).json({ error: "Payment already succeeded and cannot be cancelled" });
    }

    // Attempt to cancel on Stripe if we have a payment intent ID
    if (thankMessage.stripePaymentIntentId && thankMessage.paymentStatus === "pending") {
      try {
        const stripe = await getUncachableStripeClient();
        await stripe.paymentIntents.cancel(thankMessage.stripePaymentIntentId);
      } catch (stripeErr) {
        // Log but don't fail — reset DB state regardless so the user can proceed
        req.log.warn({ stripeErr, thankMessageId }, "Stripe PI cancel failed; resetting DB state anyway");
      }
    }

    await db
      .update(thankMessagesTable)
      .set({ paymentStatus: "none", stripePaymentIntentId: null })
      .where(eq(thankMessagesTable.id, thankMessageId));

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error cancelling payment intent");
    return res.status(500).json({ error: "Failed to cancel payment intent" });
  }
});

router.get("/stripe/connect/dashboard-link", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const technicianId = await getTechnicianIdForUser(req.user.id);
    if (!technicianId) {
      return res.status(404).json({ error: "Technician profile not found" });
    }

    const [tech] = await db
      .select()
      .from(techniciansTable)
      .where(eq(techniciansTable.id, technicianId));

    if (!tech?.stripeAccountId || !tech.stripeOnboardingComplete) {
      return res.status(402).json({ error: "Stripe onboarding is not complete" });
    }

    const stripe = await getUncachableStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(tech.stripeAccountId);

    return res.json({ url: loginLink.url });
  } catch (err) {
    req.log.error({ err }, "Error creating Stripe Express dashboard link");
    return res.status(500).json({ error: "Failed to create dashboard link" });
  }
});

router.get("/stripe/earnings", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const technicianId = await getTechnicianIdForUser(req.user.id);
    if (!technicianId) {
      return res.status(404).json({ error: "Technician profile not found" });
    }

    const rows = await db
      .select({
        id: thankMessagesTable.id,
        tipAmount: thankMessagesTable.tipAmount,
        customerName: thankMessagesTable.customerName,
        jobId: thankMessagesTable.jobId,
        jobTitle: jobsTable.title,
        createdAt: thankMessagesTable.createdAt,
      })
      .from(thankMessagesTable)
      .leftJoin(jobsTable, eq(thankMessagesTable.jobId, jobsTable.id))
      .where(
        and(
          eq(thankMessagesTable.technicianId, technicianId),
          eq(thankMessagesTable.paymentStatus, "succeeded")
        )
      )
      .orderBy(thankMessagesTable.createdAt);

    const entries = rows.map(r => ({
      id: r.id,
      tipAmount: parseFloat(r.tipAmount ?? "0"),
      customerName: r.customerName,
      jobId: r.jobId,
      jobTitle: r.jobTitle ?? "",
      createdAt: r.createdAt.toISOString(),
    }));

    const totalEarned = entries.reduce((sum, e) => sum + e.tipAmount, 0);

    return res.json({
      totalEarned: Math.round(totalEarned * 100) / 100,
      tipCount: entries.length,
      entries,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching earnings");
    return res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

router.post("/stripe/payment-complete", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { thankMessageId, paymentIntentId } = req.body as {
      thankMessageId: number;
      paymentIntentId: string;
    };

    if (!thankMessageId || !paymentIntentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch the thank message and verify it exists
    const [thankMessage] = await db
      .select()
      .from(thankMessagesTable)
      .where(eq(thankMessagesTable.id, thankMessageId));

    if (!thankMessage) {
      return res.status(404).json({ error: "Thank message not found" });
    }

    // Verify the authenticated user is the customer who owns this thank message
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile || thankMessage.customerId !== profile.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Verify the payment intent ID matches what we stored at creation time
    if (thankMessage.stripePaymentIntentId && thankMessage.stripePaymentIntentId !== paymentIntentId) {
      req.log.warn({ thankMessageId, provided: paymentIntentId, stored: thankMessage.stripePaymentIntentId }, "Payment intent ID mismatch");
      return res.status(400).json({ error: "Payment intent does not match this thank message" });
    }

    // Verify with Stripe that the payment intent actually succeeded
    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Double-check metadata linkage
    if (pi.metadata?.thankMessageId !== String(thankMessageId)) {
      req.log.warn({ thankMessageId, piMeta: pi.metadata }, "Payment intent metadata thankMessageId mismatch");
      return res.status(400).json({ error: "Payment intent is not linked to this thank message" });
    }

    if (pi.status !== "succeeded") {
      return res.status(400).json({ error: `Payment has not succeeded (status: ${pi.status})` });
    }

    // Apply full payment success side effects (idempotent — shared with webhook handler)
    const technicianId = parseInt(pi.metadata?.technicianId ?? "", 10);
    const jobId = parseInt(pi.metadata?.jobId ?? "", 10);
    const tipAmount = parseFloat(pi.metadata?.tipAmount ?? "0");

    if (isNaN(technicianId) || isNaN(jobId)) {
      req.log.error({ piMeta: pi.metadata }, "Payment intent missing technicianId or jobId in metadata");
      return res.status(500).json({ error: "Payment intent metadata is incomplete" });
    }

    await applyPaymentSuccess({ thankMessageId, paymentIntentId, technicianId, jobId });

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error recording payment completion");
    return res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
