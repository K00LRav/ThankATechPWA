import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { techniciansTable } from "./technicians";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const claimRequestsTable = pgTable("claim_requests", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id").notNull().references(() => techniciansTable.id),
  claimantName: text("claimant_name").notNull(),
  claimantEmail: text("claimant_email").notNull(),
  claimantPhone: text("claimant_phone").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClaimRequestSchema = createInsertSchema(claimRequestsTable).omit({ id: true, createdAt: true, reviewedAt: true, reviewNote: true, status: true });
export type InsertClaimRequest = z.infer<typeof insertClaimRequestSchema>;
export type ClaimRequest = typeof claimRequestsTable.$inferSelect;
