import { Router } from "express";
import { db } from "@workspace/db";
import { pointsTable, pointTransactionsTable, profilesTable, profileBadgesTable, discountVouchersTable, techniciansTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendEmail, emailVoucherRedeemed } from "../lib/mailer";

const router = Router();

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: "all" | "customer" | "technician";
}

export const REWARDS_CATALOG: Reward[] = [
  {
    id: "tip_discount_5",
    name: "5% Tip Discount Voucher",
    description: "Get 5% off your next tip. The discount code will be emailed to you automatically.",
    cost: 150,
    category: "customer",
  },
  {
    id: "top_supporter",
    name: "Top Supporter Badge",
    description: "A badge displayed on your thank you messages showing techs you're a verified generous client.",
    cost: 300,
    category: "customer",
  },
  {
    id: "featured_profile",
    name: "Featured Profile Boost",
    description: "Get featured at the top of the Browse page for 7 days, increasing your visibility to customers.",
    cost: 500,
    category: "technician",
  },
  {
    id: "top_tech_badge",
    name: "Top Tech Badge",
    description: "A verified Top Tech badge on your profile, earned through your points — shows clients you're trusted and active.",
    cost: 250,
    category: "technician",
  },
];

async function getProfile(userId: string): Promise<{ id: number; userType: string; fullName: string } | null> {
  const [profile] = await db
    .select({ id: profilesTable.id, userType: profilesTable.userType, fullName: profilesTable.fullName })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile ?? null;
}

function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "THANKS-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function fulfillReward(
  reward: Reward,
  profileId: number,
  replitUserId: string,
  profile: { fullName: string; userType: string }
): Promise<void> {
  switch (reward.id) {
    case "tip_discount_5": {
      const code = generateVoucherCode();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      await db.insert(discountVouchersTable).values({
        profileId,
        code,
        discountPercent: 5,
        expiresAt,
      });
      const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, replitUserId));
      if (user?.email) {
        const { subject, html } = emailVoucherRedeemed({
          customerName: profile.fullName,
          code,
          discountPercent: 5,
          expiresAt: expiresAt.toISOString(),
        });
        await sendEmail(user.email, subject, html).catch(() => {});
      }
      break;
    }
    case "top_supporter":
      await db.insert(profileBadgesTable).values({ profileId, badgeId: "top_supporter" }).onConflictDoNothing();
      break;
    case "featured_profile": {
      const [tech] = await db.select({ id: techniciansTable.id }).from(techniciansTable).where(eq(techniciansTable.userId, replitUserId));
      if (tech) {
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + 7);
        await db.update(techniciansTable).set({ featuredUntil }).where(eq(techniciansTable.id, tech.id));
      }
      break;
    }
    case "top_tech_badge":
      await db.insert(profileBadgesTable).values({ profileId, badgeId: "top_tech_badge" }).onConflictDoNothing();
      break;
  }
}

router.get("/points/rewards", (_req, res) => {
  res.json(REWARDS_CATALOG);
});

router.get("/points/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const requestedId = parseInt(req.params.userId);
    const profile = await getProfile(req.user.id);

    if (profile === null || profile.id !== requestedId) {
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
    const profile = await getProfile(req.user.id);

    if (profile === null || profile.id !== requestedId) {
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

router.post("/points/:userId/redeem", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const requestedId = parseInt(req.params.userId);
    const profile = await getProfile(req.user.id);

    if (profile === null || profile.id !== requestedId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { rewardId } = req.body as { rewardId?: string };
    if (!rewardId) {
      return res.status(400).json({ error: "rewardId is required" });
    }

    const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!reward) {
      return res.status(400).json({ error: "Invalid reward ID" });
    }

    // Server-side category enforcement: check userType matches reward eligibility
    if (reward.category !== "all") {
      const userType = profile.userType;
      if (reward.category === "customer" && userType !== "customer") {
        return res.status(403).json({ error: "This reward is only available to customers." });
      }
      if (reward.category === "technician" && userType !== "technician") {
        return res.status(403).json({ error: "This reward is only available to technicians." });
      }
    }

    // Atomic balance check-and-decrement using a single conditional UPDATE.
    // This prevents race conditions: if two requests arrive simultaneously,
    // only one can succeed because the WHERE balance >= cost guard is evaluated
    // atomically by Postgres. The second request will see 0 rows updated.
    const result = await db.transaction(async (tx) => {
      const updated = await tx
        .update(pointsTable)
        .set({
          balance: sql`${pointsTable.balance} - ${reward.cost}`,
          updatedAt: new Date(),
        })
        .where(
          sql`${pointsTable.userId} = ${requestedId} AND ${pointsTable.balance} >= ${reward.cost}`
        )
        .returning({ newBalance: pointsTable.balance });

      if (updated.length === 0) {
        // Either no points row exists (balance is 0) or insufficient balance
        const [existing] = await tx
          .select({ balance: pointsTable.balance })
          .from(pointsTable)
          .where(eq(pointsTable.userId, requestedId));
        const balance = existing?.balance ?? 0;
        return { success: false as const, balance };
      }

      const newBalance = updated[0].newBalance;

      await tx.insert(pointTransactionsTable).values({
        userId: requestedId,
        amount: -reward.cost,
        type: "redemption",
        description: `Redeemed: ${reward.name}`,
      });

      return { success: true as const, newBalance };
    });

    if (!result.success) {
      return res.status(400).json({
        error: `Insufficient points. You need ${reward.cost} pts but only have ${result.balance} pts.`,
      });
    }

    // Fulfill the reward (fire-and-forget so a delivery failure doesn't block the response)
    fulfillReward(reward, requestedId, req.user.id, profile).catch(err =>
      req.log.warn({ err, rewardId: reward.id, profileId: requestedId }, "Reward fulfillment failed (points already deducted)")
    );

    return res.json({
      success: true,
      newBalance: result.newBalance,
      reward: {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        cost: reward.cost,
        category: reward.category,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error redeeming points");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
