import { Router } from "express";
import { db } from "@workspace/db";
import { techniciansTable, thankMessagesTable, jobsTable } from "@workspace/db";
import { count, sql } from "drizzle-orm";

const router = Router();

router.get("/platform/stats", async (req, res) => {
  try {
    const [techCount] = await db.select({ count: count() }).from(techniciansTable);
    const [thanksCount] = await db.select({ count: count() }).from(thankMessagesTable);
    const [jobsCount] = await db.select({ count: count() }).from(jobsTable);
    const [tipsSum] = await db
      .select({ total: sql<string>`COALESCE(SUM(tip_amount), 0)` })
      .from(thankMessagesTable);

    return res.json({
      totalTechnicians: techCount.count,
      totalThanks: thanksCount.count,
      totalTipsAmount: parseFloat(tipsSum.total ?? "0"),
      totalJobs: jobsCount.count,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting platform stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
