import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

router.get("/jobs", async (req, res) => {
  try {
    const { customerId, technicianId, status } = req.query as {
      customerId?: string;
      technicianId?: string;
      status?: string;
    };

    let conditions: ReturnType<typeof eq>[] = [];
    if (customerId) conditions.push(eq(jobsTable.customerId, parseInt(customerId)));
    if (technicianId) conditions.push(eq(jobsTable.technicianId, parseInt(technicianId)));
    if (status) conditions.push(eq(jobsTable.status, status));

    const query = conditions.length > 0
      ? db.select().from(jobsTable).where(and(...conditions)).orderBy(sql`${jobsTable.createdAt} DESC`)
      : db.select().from(jobsTable).orderBy(sql`${jobsTable.createdAt} DESC`);

    const jobs = await query;
    return res.json(jobs.map(formatJob));
  } catch (err) {
    req.log.error({ err }, "Error listing jobs");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/jobs", async (req, res) => {
  try {
    const body = req.body;
    const [job] = await db.insert(jobsTable).values({
      customerId: body.customerId,
      customerName: body.customerName ?? "",
      technicianId: body.technicianId,
      technicianName: body.technicianName ?? "",
      title: body.title,
      description: body.description ?? null,
      address: body.address ?? null,
      status: "pending",
    }).returning();
    return res.status(201).json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Error creating job");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    if (!job) return res.status(404).json({ error: "Not found" });
    return res.json(formatJob(job));
  } catch (err) {
    req.log.error({ err }, "Error getting job");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/jobs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const updates: Partial<typeof jobsTable.$inferInsert> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.completedAt !== undefined) updates.completedAt = new Date(body.completedAt);

    const [job] = await db
      .update(jobsTable)
      .set(updates)
      .where(eq(jobsTable.id, id))
      .returning();
    if (!job) return res.status(404).json({ error: "Not found" });
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
    status: j.status,
    createdAt: j.createdAt?.toISOString(),
    completedAt: j.completedAt?.toISOString() ?? null,
  };
}

export default router;
