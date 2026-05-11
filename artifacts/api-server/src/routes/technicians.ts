import { Router } from "express";
import { db } from "@workspace/db";
import { techniciansTable, thankMessagesTable, jobsTable, profilesTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";

const router = Router();

router.get("/technicians", async (req, res) => {
  try {
    const { specialty, search } = req.query as { specialty?: string; search?: string };
    let query = db.select().from(techniciansTable);

    if (search) {
      const results = await db
        .select()
        .from(techniciansTable)
        .where(
          or(
            ilike(techniciansTable.fullName, `%${search}%`),
            ilike(techniciansTable.specialty, `%${search}%`),
            ilike(techniciansTable.serviceArea, `%${search}%`)
          )
        );
      return res.json(results.map(formatTechnician));
    }

    if (specialty) {
      const results = await db
        .select()
        .from(techniciansTable)
        .where(ilike(techniciansTable.specialty, `%${specialty}%`));
      return res.json(results.map(formatTechnician));
    }

    const results = await query;
    return res.json(results.map(formatTechnician));
  } catch (err) {
    req.log.error({ err }, "Error listing technicians");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/technicians", async (req, res) => {
  try {
    const body = req.body;
    const [technician] = await db.insert(techniciansTable).values({
      fullName: body.fullName,
      avatarUrl: body.avatarUrl ?? null,
      specialty: body.specialty,
      specialties: body.specialties ?? [],
      serviceArea: body.serviceArea,
      bio: body.bio ?? "",
      hourlyRate: body.hourlyRate?.toString() ?? null,
      certifications: body.certifications ?? [],
    }).returning();
    return res.status(201).json(formatTechnician(technician));
  } catch (err) {
    req.log.error({ err }, "Error creating technician");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/technicians/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [technician] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, id));
    if (!technician) return res.status(404).json({ error: "Not found" });
    return res.json(formatTechnician(technician));
  } catch (err) {
    req.log.error({ err }, "Error getting technician");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/technicians/:id/wall-of-thanks", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const thanks = await db
      .select()
      .from(thankMessagesTable)
      .where(eq(thankMessagesTable.technicianId, id))
      .orderBy(sql`${thankMessagesTable.createdAt} DESC`);
    return res.json(thanks.map(formatThank));
  } catch (err) {
    req.log.error({ err }, "Error getting wall of thanks");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/technicians/:id/earnings", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const id = parseInt(req.params.id);

    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [technician] = await db
      .select({ id: techniciansTable.id, userId: techniciansTable.userId })
      .from(techniciansTable)
      .where(eq(techniciansTable.id, id));

    if (!technician) {
      return res.status(404).json({ error: "Technician not found" });
    }

    if (technician.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const rows = await db
      .select({
        id: thankMessagesTable.id,
        jobId: thankMessagesTable.jobId,
        jobTitle: jobsTable.title,
        customerName: thankMessagesTable.customerName,
        tipAmount: thankMessagesTable.tipAmount,
        paymentStatus: thankMessagesTable.paymentStatus,
        createdAt: thankMessagesTable.createdAt,
      })
      .from(thankMessagesTable)
      .leftJoin(jobsTable, eq(thankMessagesTable.jobId, jobsTable.id))
      .where(
        and(
          eq(thankMessagesTable.technicianId, id),
          eq(thankMessagesTable.paymentStatus, "succeeded")
        )
      )
      .orderBy(sql`${thankMessagesTable.createdAt} DESC`);

    const entries = rows.map(r => ({
      id: r.id,
      jobId: r.jobId,
      jobTitle: r.jobTitle ?? "",
      customerName: r.customerName ?? "",
      tipAmount: parseFloat(r.tipAmount ?? "0"),
      paymentStatus: r.paymentStatus ?? "succeeded",
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    const totalEarned = entries.reduce((sum, e) => sum + e.tipAmount, 0);

    return res.json({
      totalEarned: Math.round(totalEarned * 100) / 100,
      tipCount: entries.length,
      entries,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching technician earnings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/technicians/:id/stats", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const thanks = await db
      .select()
      .from(thankMessagesTable)
      .where(eq(thankMessagesTable.technicianId, id));
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.technicianId, id));

    const totalThanks = thanks.length;
    // Only count tips where payment was actually confirmed (not pending/failed/skipped)
    const settledTips = thanks.filter(t => t.paymentStatus === 'succeeded' && parseFloat(t.tipAmount ?? "0") > 0);
    const totalTips = settledTips.length;
    const totalEarned = settledTips.reduce((sum, t) => sum + parseFloat(t.tipAmount ?? "0"), 0);
    const avgTipAmount = totalTips > 0 ? totalEarned / totalTips : 0;

    return res.json({
      technicianId: id,
      totalThanks,
      totalTips,
      totalEarned,
      totalJobs: jobs.length,
      avgTipAmount,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting technician stats");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function formatTechnician(t: typeof techniciansTable.$inferSelect) {
  return {
    id: t.id,
    fullName: t.fullName,
    avatarUrl: t.avatarUrl,
    specialty: t.specialty,
    specialties: t.specialties,
    serviceArea: t.serviceArea,
    bio: t.bio,
    hourlyRate: t.hourlyRate ? parseFloat(t.hourlyRate) : null,
    certifications: t.certifications,
    totalThanks: t.totalThanks,
    totalEarned: parseFloat(t.totalEarned ?? "0"),
    createdAt: t.createdAt?.toISOString(),
  };
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
    paymentStatus: t.paymentStatus ?? "none",
    photoUrl: t.photoUrl,
    createdAt: t.createdAt?.toISOString(),
  };
}

export default router;
