import { pgTable, text, serial, integer, numeric, timestamp, varchar, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const techniciansTable = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").unique(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  specialty: text("specialty").notNull(),
  specialties: text("specialties").array().notNull().default([]),
  serviceArea: text("service_area").notNull(),
  bio: text("bio").notNull().default(""),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  certifications: text("certifications").array().notNull().default([]),
  totalThanks: integer("total_thanks").notNull().default(0),
  totalEarned: numeric("total_earned", { precision: 12, scale: 2 }).notNull().default("0"),
  stripeAccountId: varchar("stripe_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  featuredUntil: timestamp("featured_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTechnicianSchema = createInsertSchema(techniciansTable).omit({ id: true, createdAt: true, totalThanks: true, totalEarned: true });
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof techniciansTable.$inferSelect;
