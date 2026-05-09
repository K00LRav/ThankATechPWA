import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pointsTable = pgTable("points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointTransactionsTable = pgTable("point_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  jobId: integer("job_id"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPointsSchema = createInsertSchema(pointsTable).omit({ id: true, updatedAt: true });
export type InsertPoints = z.infer<typeof insertPointsSchema>;
export type Points = typeof pointsTable.$inferSelect;

export const insertPointTransactionSchema = createInsertSchema(pointTransactionsTable).omit({ id: true, createdAt: true });
export type InsertPointTransaction = z.infer<typeof insertPointTransactionSchema>;
export type PointTransaction = typeof pointTransactionsTable.$inferSelect;
