import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { profilesTable, techniciansTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendEmail, emailWelcome } from "../lib/mailer";
import { geocodeAddress } from "../lib/geocoder";

const router = Router();

router.get("/profile/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    if (!profile) {
      res.json({ profile: null });
      return;
    }

    let technicianId: number | null = null;
    if (profile.userType === "technician") {
      const [tech] = await db
        .select({ id: techniciansTable.id })
        .from(techniciansTable)
        .where(eq(techniciansTable.userId, userId));
      technicianId = tech?.id ?? null;
    }

    res.json({
      profile: {
        profileId: profile.id,
        userType: profile.userType,
        technicianId,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error getting profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/profile/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const { userType, fullName, specialty, serviceArea, bio, avatarUrl } = req.body;

  if (!userType || !fullName) {
    res.status(400).json({ error: "userType and fullName are required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    const isNew = !existing;
    let profile;
    if (existing) {
      const updateFields: Record<string, unknown> = { userType, fullName };
      if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
      [profile] = await db
        .update(profilesTable)
        .set(updateFields)
        .where(eq(profilesTable.userId, userId))
        .returning();
    } else {
      [profile] = await db
        .insert(profilesTable)
        .values({ userId, userType, fullName })
        .returning();
    }

    let technicianId: number | null = null;
    if (userType === "technician") {
      const [existingTech] = await db
        .select({ id: techniciansTable.id })
        .from(techniciansTable)
        .where(eq(techniciansTable.userId, userId));

      if (existingTech) {
        technicianId = existingTech.id;
      } else {
        const resolvedServiceArea = serviceArea || "Local Area";
        const coords = await geocodeAddress(resolvedServiceArea).catch(() => null);
        const [newTech] = await db
          .insert(techniciansTable)
          .values({
            userId,
            fullName,
            specialty: specialty || "General",
            serviceArea: resolvedServiceArea,
            bio: bio || "",
            specialties: specialty ? [specialty] : [],
            certifications: [],
            avatarUrl: avatarUrl || null,
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null,
          })
          .returning();
        technicianId = newTech.id;
      }
    }

    // Send welcome email to new users only (fire-and-forget)
    if (isNew) {
      const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
      if (user?.email) {
        const tpl = emailWelcome({ fullName, userType: userType as "customer" | "technician" });
        sendEmail(user.email, tpl.subject, tpl.html).catch(() => {});
      }
    }

    res.json({
      profileId: profile.id,
      userType: profile.userType,
      technicianId,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Error upserting profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile/me/avatar", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const { avatarUrl } = req.body;

  if (!avatarUrl || typeof avatarUrl !== "string") {
    res.status(400).json({ error: "avatarUrl is required" });
    return;
  }

  try {
    await db
      .update(profilesTable)
      .set({ avatarUrl })
      .where(eq(profilesTable.userId, userId));

    await db
      .update(techniciansTable)
      .set({ avatarUrl })
      .where(eq(techniciansTable.userId, userId));

    res.json({ avatarUrl });
  } catch (err) {
    req.log.error({ err }, "Error updating avatar");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
