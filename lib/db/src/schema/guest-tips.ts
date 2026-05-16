import { pgTable, text, serial, integer, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestTipsTable = pgTable("guest_tips", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id").notNull(),
  guestName: text("guest_name").notNull(),
  message: text("message").notNull(),
  tipAmount: numeric("tip_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  paymentStatus: varchar("payment_status").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGuestTipSchema = createInsertSchema(guestTipsTable).omit({ id: true, createdAt: true });
export type InsertGuestTip = z.infer<typeof insertGuestTipSchema>;
export type GuestTip = typeof guestTipsTable.$inferSelect;
