import { Router } from "express";
import { db } from "@workspace/db";
import { thankMessagesTable, techniciansTable, pointsTable, pointTransactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/thanks", async (req, res) => {
  try {
    const { technicianId, customerId } = req.query as {
      technicianId?: string;
      customerId?: string;
    };

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
  try {
    const body = req.body;

    const [thankMessage] = await db.insert(thankMessagesTable).values({
      jobId: body.jobId,
      customerId: body.customerId,
      customerName: body.customerName ?? "A customer",
      technicianId: body.technicianId,
      technicianName: body.technicianName ?? "",
      technicianAvatar: body.technicianAvatar ?? null,
      message: body.message,
      tipAmount: (body.tipAmount ?? 0).toString(),
      photoUrl: body.photoUrl ?? null,
    }).returning();

    // Update technician totals
    await db
      .update(techniciansTable)
      .set({
        totalThanks: sql`${techniciansTable.totalThanks} + 1`,
        totalEarned: sql`${techniciansTable.totalEarned} + ${(body.tipAmount ?? 0).toString()}`,
      })
      .where(eq(techniciansTable.id, body.technicianId));

    // Award ThankYou points to customer (+15)
    await awardPoints(body.customerId, 15, "thank_sent", body.jobId, "Sent a thank you");
    // Award ThankYou points to technician (+80 for receiving, +50 for tip if applicable, +20 for job)
    await awardPoints(body.technicianId, 80, "thank_received", body.jobId, "Received a thank you");
    await awardPoints(body.technicianId, 20, "job_completed", body.jobId, "Completed a job");
    if (body.tipAmount && body.tipAmount > 0) {
      await awardPoints(body.technicianId, 50, "tip_received", body.jobId, "Received a tip");
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
  // Upsert points balance
  await db
    .insert(pointsTable)
    .values({ userId, balance: amount })
    .onConflictDoUpdate({
      target: pointsTable.userId,
      set: { balance: sql`${pointsTable.balance} + ${amount}`, updatedAt: new Date() },
    });

  // Record transaction
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
