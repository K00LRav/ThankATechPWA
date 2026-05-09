import { Router } from "express";
import { db } from "@workspace/db";
import { thankMessagesTable, techniciansTable, pointsTable, pointTransactionsTable, profilesTable, jobsTable, pushTokensTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

async function getProfileId(userId: string): Promise<number | null> {
  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile?.id ?? null;
}

router.get("/thanks", async (req, res) => {
  try {
    const { technicianId, customerId } = req.query as {
      technicianId?: string;
      customerId?: string;
    };

    if (customerId) {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const profileId = await getProfileId(req.user.id);
      if (profileId === null || profileId !== parseInt(customerId)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    let conditions: ReturnType<typeof eq>[] = [];
    if (technicianId) conditions.push(eq(thankMessagesTable.technicianId, parseInt(technicianId)));
    if (customerId) conditions.push(eq(thankMessagesTable.customerId, parseInt(customerId)));

    const query = conditions.length > 0
      ? db.select().from(thankMessagesTable).where(and(...conditions)).orderBy(sql`${thankMessagesTable.createdAt} DESC`)
      : db.select().from(thankMessagesTable).orderBy(sql`${thankMessagesTable.createdAt} DESC`);

    const thanks = await query;
    return res.json(thanks.map(formatThank));
  } catch (err) {
    req.log.error({ err }, "Error listing thank messages");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/thanks", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = req.body;

    // Derive the requester's profile from the authenticated session — never trust body.customerId for auth.
    const profileId = await getProfileId(req.user.id);
    if (profileId === null) {
      res.status(403).json({ error: "Forbidden: no profile found for your account" });
      return;
    }

    // Load the job and verify ownership server-side.
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, body.jobId));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (job.customerId !== profileId) {
      res.status(403).json({ error: "Forbidden: this job does not belong to your account" });
      return;
    }

    // Use the job's authoritative technicianId — never trust body.technicianId.
    const authorizedTechnicianId = job.technicianId;

    const [thankMessage] = await db.insert(thankMessagesTable).values({
      jobId: job.id,
      customerId: profileId,
      customerName: body.customerName ?? "A customer",
      technicianId: authorizedTechnicianId,
      technicianName: body.technicianName ?? "",
      technicianAvatar: body.technicianAvatar ?? null,
      message: body.message,
      tipAmount: (body.tipAmount ?? 0).toString(),
      photoUrl: body.photoUrl ?? null,
    }).returning();

    await db
      .update(techniciansTable)
      .set({
        totalThanks: sql`${techniciansTable.totalThanks} + 1`,
        // totalEarned is updated only after payment is confirmed (webhook: payment_intent.succeeded)
      })
      .where(eq(techniciansTable.id, authorizedTechnicianId));

    await awardPoints(profileId, 15, "thank_sent", job.id, "Sent a thank you");
    await awardPoints(authorizedTechnicianId, 80, "thank_received", job.id, "Received a thank you");
    await awardPoints(authorizedTechnicianId, 20, "job_completed", job.id, "Completed a job");
    // tip_received points (50) are awarded only after payment is confirmed (webhook: payment_intent.succeeded)

    // Derive customer display name from authenticated profile for notification integrity.
    const [customerProfile] = await db
      .select({ fullName: profilesTable.fullName })
      .from(profilesTable)
      .where(eq(profilesTable.id, profileId));
    const customerDisplayName = customerProfile?.fullName ?? "A customer";

    // Fire push notification to the technician asynchronously — don't let failures block the response.
    sendThankNotification(authorizedTechnicianId, customerDisplayName, body.message, body.tipAmount ?? 0)
      .catch((err) => req.log.warn({ err }, "Failed to send push notification"));

    return res.status(201).json(formatThank(thankMessage));
  } catch (err) {
    req.log.error({ err }, "Error creating thank message");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/thanks/recent", async (req, res) => {
  try {
    const thanks = await db
      .select()
      .from(thankMessagesTable)
      .orderBy(sql`${thankMessagesTable.createdAt} DESC`)
      .limit(20);
    return res.json(thanks.map(formatThank));
  } catch (err) {
    req.log.error({ err }, "Error getting recent thanks");
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function sendThankNotification(
  technicianId: number,
  customerName: string,
  message: string,
  tipAmount: number,
): Promise<void> {
  // Look up the technician's userId so we can find their profileId.
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

  const tipLine = tipAmount > 0 ? ` (+$${tipAmount} tip)` : "";
  const body = `${customerName}: "${message.slice(0, 100)}${message.length > 100 ? "…" : ""}"${tipLine}`;

  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: "default" as const,
    title: "You received a thank you! 🎉",
    body,
    data: { technicianId },
  }));

  const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
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
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
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
}

async function awardPoints(userId: number, amount: number, type: string, jobId: number, description: string) {
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

function formatThank(t: typeof thankMessagesTable.$inferSelect) {
  return {
    id: t.id,
    jobId: t.jobId,
    customerId: t.customerId,
    customerName: t.customerName,
    technicianId: t.technicianId,
    technicianName: t.technicianName,
    technicianAvatar: t.technicianAvatar,
    message: t.message,
    tipAmount: parseFloat(t.tipAmount ?? "0"),
    stripePaymentIntentId: t.stripePaymentIntentId ?? null,
    paymentStatus: t.paymentStatus ?? "none",
    photoUrl: t.photoUrl,
    createdAt: t.createdAt?.toISOString(),
  };
}

export default router;
