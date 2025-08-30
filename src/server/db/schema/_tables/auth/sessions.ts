import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/_tables/auth/users"; // Import for foreign key

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // better-auth generates string IDs
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // Session token should be unique
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});
