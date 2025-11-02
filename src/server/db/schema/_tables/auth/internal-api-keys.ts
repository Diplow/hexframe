import {
  pgTable,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/_tables/auth/users";

/**
 * Internal API keys for server-to-server communication
 *
 * Unlike user-facing API keys (apiKeys table), these are:
 * - ENCRYPTED (not hashed) so server can retrieve plaintext
 * - NEVER exposed to client (server-only)
 * - Auto-managed (user doesn't see or copy them)
 * - Used for MCP server authentication
 *
 * Security model:
 * - Keys stored encrypted with ENCRYPTION_KEY env var
 * - Never returned in tRPC responses
 * - Only used server-side to authenticate with internal services
 * - One key per (userId, purpose) pair
 */
export const internalApiKeys = pgTable("internal_api_key", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Purpose identifier (e.g., 'mcp')
  purpose: text("purpose").notNull(),

  // ENCRYPTED key (not hashed - we need to decrypt it for use)
  // Format: iv:encrypted:authTag (hex-encoded)
  encryptedKey: text("encrypted_key").notNull(),

  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
});

export type InternalApiKey = typeof internalApiKeys.$inferSelect;
export type NewInternalApiKey = typeof internalApiKeys.$inferInsert;
