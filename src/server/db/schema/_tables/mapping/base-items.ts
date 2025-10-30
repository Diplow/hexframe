import { integer, text, timestamp, foreignKey, index, check, type PgTableExtraConfig } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createTable } from "~/server/db/schema/_utils";

export const baseItems = createTable("base_items", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  preview: text("preview"),
  link: text("link"),
  originId: integer("origin_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table): PgTableExtraConfig => {
  return {
    originFk: foreignKey({
      columns: [table.originId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    noSelfReferenceConstraint: check(
      "base_item_no_self_reference",
      sql`${table.originId} IS NULL OR ${table.originId} != ${table.id}`,
    ),
    originIdIdx: index("base_item_origin_id_idx").on(table.originId),
  };
});
