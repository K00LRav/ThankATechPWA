import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, profilesTable, techniciansTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

interface UserIdentity {
  profileId: number | null;
  technicianId: number | null;
  userType: string | null;
}

async function getUserIdentity(userId: string): Promise<UserIdentity> {
  const [profile] = await db
    .select({ id: profilesTable.id, userType: profilesTable.userType })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  if (!profile) return { profileId: null, technicianId: null, userType: null };

  let technicianId: number | null = null;
  if (profile.userType === "technician") {
    const [tech] = await db
      .select({ id: techniciansTable.id })
      .from(techniciansTable)
      .where(eq(techniciansTable.userId, userId));
    technicianId = tech?.id ?? null;
  }

  return { profileId: profile.id, technicianId, userType: profile.userType };
}

router.get("/jobs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { profileId, technicianId, userType } = await getUserIdentity(req.user.id);

    if (!userType) {
      return res.json([]);
    }

    let jobs;
    if (userType === "customer" && profileId !== null) {
      jobs = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.customerId, profileId))
        .orderBy(sql`${jobsTable.createdAt} DESC`);
    } else if (userType === "technician" && technicianId !== null) {
      jobs = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.technicianId, technicianId))
        .orderBy(sql`${jobsTable.createdAt} DESC`);
    } else {
      return res.json([]);
    }

    return res.json(jobs.map(formatJob));
  } catch (err) {
    req.log.error({ err }, "Error listing jobs");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/jobs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { profileId, userType } = await getUserIdentity(req.user.id);

    if (userType !== "customer" || profileId === null) {
      res.status(403).json({ error: "Only customers can create jobs" });
      return;
    }

    const body = req.body;

    const [profile] = await db
      .select({ fullName: profilesTable.fullName })
      .from(profilesTable)
      .where(eq(profilesTable.id, profileId));

    const [techProfile] = await db
      .select({ fullName: techniciansTable.fullName })
      .from(techniciansTable)
      .where(eq(techniciansTable.id, body.technicianId));

    const [job] = await db.insert(jobsTable).values({
      customerId: profileId,
      customerName: profile?.fullName ?? body.customerName ?? "",
      technicianId: body.technicianId,
      technicianName: techProfile?.fullName ?? body.technicianName ?? "",
      title: body.title,
      description: body.description ?? null,
      address: body.address ?? null,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      status: "pending",
    }).returning();
    return res.status(201).json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Error creating job");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    const { profileId, technicianId } = await getUserIdentity(req.user.id);

    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    if (!job) return res.status(404).json({ error: "Not found" });

    if (job.customerId !== profileId && job.technicianId !== technicianId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Error getting job");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/jobs/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    const { technicianId } = await getUserIdentity(req.user.id);

    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (existing.technicianId !== technicianId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = req.body;
    const updates: Partial<typeof jobsTable.$inferInsert> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.completedAt !== undefined) updates.completedAt = new Date(body.completedAt);

    const [job] = await db
      .update(jobsTable)
      .set(updates)
      .where(eq(jobsTable.id, id))
      .returning();
    return res.json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Error updating job");
    return res.status(500).json({ error: "Internal server error" });
  }
});

function formatJob(j: typeof jobsTable.$inferSelect) {
  return {
    id: j.id,
    customerId: j.customerId,
    customerName: j.customerName,
    technicianId: j.technicianId,
    technicianName: j.technicianName,
    title: j.title,
    description: j.description,
    address: j.address,
    scheduledDate: j.scheduledDate?.toISOString() ?? null,
    status: j.status,
    createdAt: j.createdAt?.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
  };
}

export default router;
