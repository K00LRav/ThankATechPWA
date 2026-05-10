import { pgTable, text, serial, integer, numeric, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const thankMessagesTable = pgTable("thank_messages", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  customerId: integer("customer_id").notNull(),
  customerName: text("customer_name").notNull().default(""),
  technicianId: integer("technician_id").notNull(),
  technicianName: text("technician_name").notNull().default(""),
  technicianAvatar: text("technician_avatar"),
  message: text("message").notNull(),
  tipAmount: numeric("tip_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  paymentStatus: varchar("payment_status").notNull().default("none"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("thank_messages_job_id_customer_id_unique").on(table.jobId, table.customerId),
]);

export const insertThankMessageSchema = createInsertSchema(thankMessagesTable).omit({ id: true, createdAt: true });
export type InsertThankMessage = z.infer<typeof insertThankMessageSchema>;
export type ThankMessage = typeof thankMessagesTable.$inferSelect;
