import { integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable } from "~/server/db/schema/_utils";
import { baseItems } from "~/server/db/schema/_tables/mapping/base-items";

/**
 * Base Item Versions Table
 *
 * Stores historical snapshots of baseItem content for version history tracking.
 * Each version is immutable once created. Versions are created automatically
 * when baseItems are updated.
 *
 * Version Numbering:
 * - Sequential: 1, 2, 3, ... (not timestamps or UUIDs)
 * - Unique per baseItem: enforced by composite unique index
 *
 * Cascading Delete:
 * - When baseItem is deleted, all versions are also deleted
 * - Orphaned version history has no value
 */
export const baseItemVersions = createTable(
  "base_item_versions",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    baseItemId: integer("base_item_id")
      .notNull()
      .references(() => baseItems.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    preview: text("preview"),
    link: text("link"),
    versionNumber: integer("version_number").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedBy: text("updated_by"), // Future: FK to users table for audit trail
  },
  (table) => ({
    // Composite unique index ensures one version number per baseItem
    uniqueVersionPerItem: uniqueIndex("base_item_versions_unique_version_idx").on(
      table.baseItemId,
      table.versionNumber
    ),
  })
);
