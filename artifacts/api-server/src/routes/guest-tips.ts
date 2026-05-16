import { Router } from "express";
import { db } from "@workspace/db";
import { guestTipsTable, techniciansTable } from "@workspace/db";
import { eq, ne, and, sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/guest-tips/init
 * No authentication required — anyone can tip a technician via their QR code.
 * Creates a guest tip record and, if a tip amount is provided, a Stripe PaymentIntent.
 */
router.post("/guest-tips/init", async (req, res) => {
  try {
    const { technicianId, guestName, message, tipAmount } = req.body as {
      technicianId: number;
      guestName: string;
      message: string;
      tipAmount: number;
    };

    if (!technicianId || !guestName?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "technicianId, guestName, and message are required" });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ error: "Message must be at least 10 characters" });
    }

    const [tech] = await db
      .select()
      .from(techniciansTable)
      .where(eq(techniciansTable.id, technicianId));

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const normalizedTip = Math.max(0, parseFloat(String(tipAmount ?? 0)) || 0);

    const [guestTip] = await db
      .insert(guestTipsTable)
      .values({
        technicianId,
        guestName: guestName.trim(),
        message: message.trim(),
        tipAmount: String(normalizedTip),
        paymentStatus: "none",
      })
      .returning();

    if (normalizedTip <= 0) {
      // No tip — mark as complete immediately (message-only)
      await db
        .update(guestTipsTable)
        .set({ paymentStatus: "none" })
        .where(eq(guestTipsTable.id, guestTip.id));

      // Award thanks count to technician
      await db
        .update(techniciansTable)
        .set({ totalThanks: sql`${techniciansTable.totalThanks} + 1` })
        .where(eq(techniciansTable.id, technicianId));

      return res.json({ guestTipId: guestTip.id, requiresPayment: false });
    }

    // Tip requested — validate tech Stripe setup
    if (!tech.stripeAccountId || !tech.stripeOnboardingComplete) {
      return res.status(402).json({
        error: "This technician has not set up their payout account yet and cannot accept tips at this time.",
      });
    }

    const amountCents = Math.round(normalizedTip * 100);
    if (amountCents < 50) {
      return res.status(400).json({ error: "Minimum tip is $0.50" });
    }

    const stripe = await getUncachableStripeClient();
    const platformFeePercent = 0.09;
    const applicationFeeAmount = Math.round(amountCents * platformFeePercent);

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          guestTipId: String(guestTip.id),
          technicianId: String(technicianId),
          guestName: guestName.trim(),
          tipAmount: String(normalizedTip),
        },
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: tech.stripeAccountId },
      },
      { idempotencyKey: `pi-guesttip-${guestTip.id}` },
    );

    await db
      .update(guestTipsTable)
      .set({ stripePaymentIntentId: paymentIntent.id, paymentStatus: "pending" })
      .where(eq(guestTipsTable.id, guestTip.id));

    return res.json({
      guestTipId: guestTip.id,
      clientSecret: paymentIntent.client_secret,
      requiresPayment: true,
    });
  } catch (err) {
    logger.error({ err }, "Error initialising guest tip");
    return res.status(500).json({ error: "Failed to create guest tip" });
  }
});

/**
 * POST /api/guest-tips/complete
 * Called by the frontend after Stripe confirms payment.
 * Idempotent — safe to call more than once.
 */
router.post("/guest-tips/complete", async (req, res) => {
  try {
    const { guestTipId, paymentIntentId } = req.body as {
      guestTipId: number;
      paymentIntentId: string;
    };

    if (!guestTipId || !paymentIntentId) {
      return res.status(400).json({ error: "guestTipId and paymentIntentId are required" });
    }

    const [guestTip] = await db
      .select()
      .from(guestTipsTable)
      .where(eq(guestTipsTable.id, guestTipId));

    if (!guestTip) {
      return res.status(404).json({ error: "Guest tip not found" });
    }

    if (guestTip.paymentStatus === "succeeded") {
      return res.json({ success: true, alreadyProcessed: true });
    }

    // Verify with Stripe that the PI actually succeeded
    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return res.status(402).json({ error: `Payment not yet confirmed (status: ${pi.status})` });
    }

    // Idempotent update — only applies when not already succeeded
    const updated = await db
      .update(guestTipsTable)
      .set({ paymentStatus: "succeeded", stripePaymentIntentId: paymentIntentId })
      .where(
        and(eq(guestTipsTable.id, guestTipId), ne(guestTipsTable.paymentStatus, "succeeded")),
      )
      .returning({ id: guestTipsTable.id, tipAmount: guestTipsTable.tipAmount, technicianId: guestTipsTable.technicianId });

    if (updated.length === 0) {
      return res.json({ success: true, alreadyProcessed: true });
    }

    const tipAmount = parseFloat(updated[0].tipAmount ?? "0");
    const technicianId = updated[0].technicianId;

    // Credit technician earnings and thanks count atomically
    await db
      .update(techniciansTable)
      .set({
        totalThanks: sql`${techniciansTable.totalThanks} + 1`,
        totalEarned: sql`${techniciansTable.totalEarned} + ${tipAmount}`,
      })
      .where(eq(techniciansTable.id, technicianId));

    logger.info({ guestTipId, technicianId, tipAmount }, "Guest tip payment succeeded");
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error completing guest tip payment");
    return res.status(500).json({ error: "Failed to complete payment" });
  }
});

/**
 * GET /api/guest-tips/technician/:technicianId
 * Returns recent guest tips for a technician's Wall of Thanks.
 */
router.get("/guest-tips/technician/:technicianId", async (req, res) => {
  try {
    const technicianId = parseInt(req.params.technicianId, 10);
    if (isNaN(technicianId)) {
      return res.status(400).json({ error: "Invalid technician ID" });
    }

    const tips = await db
      .select()
      .from(guestTipsTable)
      .where(eq(guestTipsTable.technicianId, technicianId))
      .orderBy(sql`${guestTipsTable.createdAt} DESC`)
      .limit(50);

    return res.json(tips);
  } catch (err) {
    logger.error({ err }, "Error fetching guest tips");
    return res.status(500).json({ error: "Failed to fetch guest tips" });
  }
});

export default router;
