import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/_tables/auth/users";

/**
 * User Template Allowlist table - stores per-user allowed template names
 *
 * Users can only execute templates that are:
 * 1. Built-in (system, user, organizational, context) - always allowed
 * 2. In their custom allowlist - stored here
 *
 * The allowedTemplates column stores an array of template names (strings).
 * Template names are case-insensitive for matching purposes.
 */
export const userTemplateAllowlist = pgTable("user_template_allowlist", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  allowedTemplates: text("allowed_templates").array().notNull().default([]),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  uniqueUserAllowlist: uniqueIndex("unique_user_allowlist").on(table.userId),
  userIdIdx: index("user_template_allowlist_user_id_idx").on(table.userId),
}));

export type UserTemplateAllowlistRecord = typeof userTemplateAllowlist.$inferSelect;
export type NewUserTemplateAllowlistRecord = typeof userTemplateAllowlist.$inferInsert;
