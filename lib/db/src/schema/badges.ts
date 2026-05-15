import { pgTable, serial, integer, text, timestamp, varchar, unique } from "drizzle-orm/pg-core";

export const profileBadgesTable = pgTable("profile_badges", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  badgeId: text("badge_id").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("profile_badges_profile_id_badge_id_unique").on(t.profileId, t.badgeId),
]);

export type ProfileBadge = typeof profileBadgesTable.$inferSelect;

export const discountVouchersTable = pgTable("discount_vouchers", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  discountPercent: integer("discount_percent").notNull().default(5),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DiscountVoucher = typeof discountVouchersTable.$inferSelect;
