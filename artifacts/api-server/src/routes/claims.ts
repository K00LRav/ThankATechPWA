import { Router } from "express";
import { db } from "@workspace/db";
import { claimRequestsTable, techniciansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/technicians/:id/claim", async (req, res) => {
  const techId = parseInt(req.params.id, 10);
  if (isNaN(techId)) { res.status(400).json({ error: "Invalid technician id" }); return; }

  const { claimantName, claimantEmail, claimantPhone } = req.body ?? {};
  if (!claimantName || typeof claimantName !== "string" || claimantName.trim().length < 2) {
    res.status(400).json({ error: "claimantName is required (min 2 chars)" }); return;
  }
  if (!claimantEmail || typeof claimantEmail !== "string" || !claimantEmail.includes("@")) {
    res.status(400).json({ error: "Valid claimantEmail is required" }); return;
  }
  if (!claimantPhone || typeof claimantPhone !== "string" || claimantPhone.trim().length < 7) {
    res.status(400).json({ error: "claimantPhone is required (min 7 chars)" }); return;
  }

  const [tech] = await db.select().from(techniciansTable).where(eq(techniciansTable.id, techId));
  if (!tech) { res.status(404).json({ error: "Technician not found" }); return; }
  if (tech.claimed) { res.status(409).json({ error: "This profile has already been claimed" }); return; }
  if (tech.claimRequestPending) { res.status(409).json({ error: "A claim request is already pending for this profile" }); return; }

  await db.insert(claimRequestsTable).values({
    technicianId: techId,
    claimantName: claimantName.trim(),
    claimantEmail: claimantEmail.trim(),
    claimantPhone: claimantPhone.trim(),
  });

  await db.update(techniciansTable)
    .set({ claimRequestPending: true })
    .where(eq(techniciansTable.id, techId));

  req.log.info({ techId, email: parsed.data.claimantEmail }, "Claim request submitted");
  res.status(201).json({ ok: true });
});

router.get("/admin/claim-requests", async (req, res) => {
  const rows = await db
    .select({
      id: claimRequestsTable.id,
      technicianId: claimRequestsTable.technicianId,
      claimantName: claimRequestsTable.claimantName,
      claimantEmail: claimRequestsTable.claimantEmail,
      claimantPhone: claimRequestsTable.claimantPhone,
      status: claimRequestsTable.status,
      createdAt: claimRequestsTable.createdAt,
      techName: techniciansTable.fullName,
      techSpecialty: techniciansTable.specialty,
      techServiceArea: techniciansTable.serviceArea,
    })
    .from(claimRequestsTable)
    .leftJoin(techniciansTable, eq(claimRequestsTable.technicianId, techniciansTable.id))
    .orderBy(claimRequestsTable.createdAt);
  res.json(rows);
});

router.post("/admin/claim-requests/:id/approve", async (req, res) => {
  const claimId = parseInt(req.params.id, 10);
  if (isNaN(claimId)) { res.status(400).json({ error: "Invalid claim id" }); return; }

  const [claim] = await db.select().from(claimRequestsTable).where(eq(claimRequestsTable.id, claimId));
  if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
  if (claim.status !== "pending") { res.status(409).json({ error: "Claim already reviewed" }); return; }

  await db.update(claimRequestsTable)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(claimRequestsTable.id, claimId));

  await db.update(techniciansTable)
    .set({ claimed: true, claimRequestPending: false })
    .where(eq(techniciansTable.id, claim.technicianId));

  res.json({ ok: true });
});

router.post("/admin/claim-requests/:id/reject", async (req, res) => {
  const claimId = parseInt(req.params.id, 10);
  if (isNaN(claimId)) { res.status(400).json({ error: "Invalid claim id" }); return; }

  const [claim] = await db.select().from(claimRequestsTable).where(eq(claimRequestsTable.id, claimId));
  if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
  if (claim.status !== "pending") { res.status(409).json({ error: "Claim already reviewed" }); return; }

  await db.update(claimRequestsTable)
    .set({ status: "rejected", reviewedAt: new Date() })
    .where(eq(claimRequestsTable.id, claimId));

  await db.update(techniciansTable)
    .set({ claimRequestPending: false })
    .where(eq(techniciansTable.id, claim.technicianId));

  res.json({ ok: true });
});

export default router;
