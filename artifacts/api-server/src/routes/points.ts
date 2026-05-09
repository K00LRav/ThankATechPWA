import { Router } from "express";
import { db } from "@workspace/db";
import { pointsTable, pointTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/points/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [points] = await db.select().from(pointsTable).where(eq(pointsTable.userId, userId));
    if (!points) {
      return res.json({ userId, balance: 0, updatedAt: new Date().toISOString() });
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
  try {
    const userId = parseInt(req.params.userId);
    const transactions = await db
      .select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, userId))
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
