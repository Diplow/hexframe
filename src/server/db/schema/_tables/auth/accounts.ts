import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/_tables/auth/users"; // Import for foreign key

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(), // better-auth generates string IDs
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(), // Provider's user ID or user.id for credentials
  providerId: text("provider_id").notNull(), // e.g., 'email', 'github'

  // OAuth fields
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    mode: "date",
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    mode: "date",
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),

  // Credentials field (for email/password)
  password: text("password"), // Will store hashed password

  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Note: `accountId` and `providerId` likely form a composite unique constraint
// for OAuth accounts, e.g., a user can only have one GitHub account linked.
// better-auth might handle this logic or expect such a constraint.
// For now, defining fields as per core schema.
// Drizzle can add composite keys like: primaryKey({ columns: [accounts.providerId, accounts.accountId]})
// but `id` is already primaryKey. We might need a uniqueIndex.
// Example: uniqueIndex("accounts_provider_account_idx").on(accounts.providerId, accounts.accountId)
// This should be added if better-auth doesn't enforce uniqueness in the adapter/logic.
