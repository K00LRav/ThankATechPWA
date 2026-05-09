import { Router } from "express";
import { db } from "@workspace/db";
import { pushTokensTable, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getProfileId(userId: string): Promise<number | null> {
  const [profile] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile?.id ?? null;
}

router.post("/push-tokens", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    const profileId = await getProfileId(req.user.id);
    if (profileId === null) {
      res.status(403).json({ error: "No profile found" });
      return;
    }

    await db
      .insert(pushTokensTable)
      .values({ profileId, token })
      .onConflictDoNothing();

    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error registering push token");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/push-tokens", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  try {
    const profileId = await getProfileId(req.user.id);
    if (profileId === null) {
      res.status(403).json({ error: "No profile found" });
      return;
    }

    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.profileId, profileId), eq(pushTokensTable.token, token)));

    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error removing push token");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
