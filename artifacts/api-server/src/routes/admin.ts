import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  techniciansTable,
  jobsTable,
  thankMessagesTable,
  claimRequestsTable,
} from "@workspace/db";
import { eq, desc, sql, ilike, or, count } from "drizzle-orm";
import { adminMiddleware } from "../middlewares/adminMiddleware";

const router = Router();

router.use("/admin", adminMiddleware);

// GET /admin/stats — extended platform overview
router.get("/admin/stats", async (req, res) => {
  try {
    const [[userCount], [techCount], [jobCount], [thankCount], [tipSum], [pendingClaims]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
      db.select({ count: sql<number>`count(*)::int` }).from(techniciansTable),
      db.select({ count: sql<number>`count(*)::int` }).from(jobsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(thankMessagesTable),
      db.select({ total: sql<number>`coalesce(sum(tip_amount),0)::int` }).from(thankMessagesTable),
      db.select({ count: sql<number>`count(*)::int` }).from(claimRequestsTable).where(eq(claimRequestsTable.status, "pending")),
    ]);
    res.json({
      totalUsers: userCount.count,
      totalTechnicians: techCount.count,
      totalJobs: jobCount.count,
      totalThanks: thankCount.count,
      totalTipsAmount: tipSum.total,
      pendingClaims: pendingClaims.count,
    });
  } catch (err) {
    req.log.error({ err }, "admin/stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/users — paginated + searchable
router.get("/admin/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const q = String(req.query.q ?? "").trim();
    const offset = (page - 1) * limit;

    const where = q
      ? or(
          ilike(usersTable.email, `%${q}%`),
          ilike(usersTable.firstName, `%${q}%`),
          ilike(usersTable.lastName, `%${q}%`),
          ilike(profilesTable.fullName, `%${q}%`),
        )
      : undefined;

    const baseQuery = db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        isAdmin: usersTable.isAdmin,
        createdAt: usersTable.createdAt,
        profileId: profilesTable.id,
        userType: profilesTable.userType,
        fullName: profilesTable.fullName,
      })
      .from(usersTable)
      .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id));

    const countQuery = db
      .select({ total: count() })
      .from(usersTable)
      .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id));

    const [rows, [{ total }]] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery,
    ]);

    res.json({ rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    req.log.error({ err }, "admin/users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/users/:id — delete user + profile
router.delete("/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(profilesTable).where(eq(profilesTable.userId, id));
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "admin/users delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/users/:id/admin — toggle admin status
router.patch("/admin/users/:id/admin", async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body as { isAdmin: boolean };
    await db.update(usersTable).set({ isAdmin }).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "admin/users admin toggle error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/technicians — paginated + searchable
router.get("/admin/technicians", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const q = String(req.query.q ?? "").trim();
    const offset = (page - 1) * limit;

    const where = q
      ? or(
          ilike(techniciansTable.fullName, `%${q}%`),
          ilike(techniciansTable.specialty, `%${q}%`),
          ilike(techniciansTable.serviceArea, `%${q}%`),
        )
      : undefined;

    const baseQuery = db.select().from(techniciansTable);
    const countQuery = db.select({ total: count() }).from(techniciansTable);

    const [rows, [{ total }]] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(techniciansTable.id))
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery,
    ]);

    res.json({ rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    req.log.error({ err }, "admin/technicians error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/technicians/:id — remove technician
router.delete("/admin/technicians/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(techniciansTable).where(eq(techniciansTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "admin/technicians delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/jobs — all jobs
router.get("/admin/jobs", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(jobsTable)
      .orderBy(desc(jobsTable.createdAt))
      .limit(200);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "admin/jobs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/thanks — all thanks + tips
router.get("/admin/thanks", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(thankMessagesTable)
      .orderBy(desc(thankMessagesTable.createdAt))
      .limit(200);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "admin/thanks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/me — check if current user is admin (used by frontend)
router.get("/admin/me", async (_req, res) => {
  res.json({ isAdmin: true });
});

export default router;
