import {
  integer,
  varchar,
  timestamp,
  index,
  foreignKey,
  type PgTableExtraConfig,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createTable } from "~/server/db/schema/_utils";
import { baseItems } from "~/server/db/schema/_tables/mapping/base-items";
import { type MapItemType } from "~/lib/domains/mapping";

export const mapItems = createTable(
  "map_items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    coord_user_id: integer("coord_user_id").notNull(),
    coord_group_id: integer("coord_group_id").notNull().default(0),
    path: varchar("path", { length: 255 }).notNull().default(""),
    item_type: varchar("item_type", { length: 50 })
      .$type<MapItemType>()
      .notNull(),
    originId: integer("origin_id"),
    parentId: integer("parent_id"),
    refItemId: integer("ref_item_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t): PgTableExtraConfig => ({
    coordIndex: uniqueIndex("map_items_coord_idx").on(
      t.coord_user_id,
      t.coord_group_id,
      t.path
    ),
    userIdIndex: index("map_items_user_id_idx").on(t.coord_user_id),
    refItemIdIndex: index("map_items_ref_item_id_idx").on(t.refItemId),
    parentIdIndex: index("map_items_parent_id_idx").on(t.parentId),

    // Foreign key constraints
    refItemFk: foreignKey({
      columns: [t.refItemId],
      foreignColumns: [baseItems.id],
      name: "map_items_ref_item_fk"
    }),

    parentFk: foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: "map_items_parent_fk"
    }),

    // Check constraints
    pathFormatCheck: check(
      "map_items_path_format_check",
      sql`${t.path} ~ '^[0-6,]*$'`
    ),

    itemTypeCheck: check(
      "map_items_type_check",
      sql`${t.item_type} IN ('item', 'hierarchy', 'empty')`
    ),
  })
);

export type MapItem = typeof mapItems.$inferSelect;
export type NewMapItem = typeof mapItems.$inferInsert;