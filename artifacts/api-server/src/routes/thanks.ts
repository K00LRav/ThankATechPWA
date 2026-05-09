import { Router } from "express";
import { db } from "@workspace/db";
import { thankMessagesTable, techniciansTable, pointsTable, pointTransactionsTable, profilesTable, jobsTable } from "@workspace/db";
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
    const profileId = await getProfileId(req.user.id);

    if (profileId === null || profileId !== body.customerId) {
      res.status(403).json({ error: "Forbidden: customerId does not match your account" });
      return;
    }

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, body.jobId));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (job.customerId !== profileId) {
      res.status(403).json({ error: "Forbidden: this job does not belong to your account" });
      return;
    }

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
        totalEarned: sql`${techniciansTable.totalEarned} + ${(body.tipAmount ?? 0).toString()}`,
      })
      .where(eq(techniciansTable.id, authorizedTechnicianId));

    await awardPoints(profileId, 15, "thank_sent", job.id, "Sent a thank you");
    await awardPoints(authorizedTechnicianId, 80, "thank_received", job.id, "Received a thank you");
    await awardPoints(authorizedTechnicianId, 20, "job_completed", job.id, "Completed a job");
    if (body.tipAmount && body.tipAmount > 0) {
      await awardPoints(authorizedTechnicianId, 50, "tip_received", job.id, "Received a tip");
    }

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
    photoUrl: t.photoUrl,
    createdAt: t.createdAt?.toISOString(),
  };
}

export default router;
