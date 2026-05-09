import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.profileId, t.token),
]);

export type PushToken = typeof pushTokensTable.$inferSelect;
