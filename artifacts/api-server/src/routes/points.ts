import { Router } from "express";
import { db } from "@workspace/db";
import { pointsTable, pointTransactionsTable, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function getProfileId(userId: string): Promise<number | null> {
  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile?.id ?? null;
}

router.get("/points/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const requestedId = parseInt(req.params.userId);
    const profileId = await getProfileId(req.user.id);

    if (profileId === null || profileId !== requestedId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [points] = await db
      .select()
      .from(pointsTable)
      .where(eq(pointsTable.userId, requestedId));

    if (!points) {
      return res.json({ userId: requestedId, balance: 0, updatedAt: new Date().toISOString() });
    }
    return res.json({
      userId: points.userId,
      balance: points.balance,
      updatedAt: points.updatedAt?.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting points");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/points/:userId/transactions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const requestedId = parseInt(req.params.userId);
    const profileId = await getProfileId(req.user.id);

    if (profileId === null || profileId !== requestedId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const transactions = await db
      .select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, requestedId))
      .orderBy(sql`${pointTransactionsTable.createdAt} DESC`);

    return res.json(transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      amount: t.amount,
      type: t.type,
      jobId: t.jobId,
      description: t.description,
      createdAt: t.createdAt?.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error getting point transactions");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
