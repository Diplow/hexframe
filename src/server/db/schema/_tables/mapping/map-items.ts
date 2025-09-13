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
import { type MapItemType } from "~/lib/domains/mapping/_objects";

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
  (table): PgTableExtraConfig => {
    return {
      originFk: foreignKey({
        columns: [table.originId],
        foreignColumns: [table.id],
      }).onDelete("set null"),
      parentFk: foreignKey({
        columns: [table.parentId],
        foreignColumns: [table.id],
      }).onDelete("cascade"),
      refItemFk: foreignKey({
        columns: [table.refItemId],
        foreignColumns: [baseItems.id],
      }).onDelete("restrict"),
      userItemParentConstraint: check(
        "user_item_parent_constraint",
        sql`(${table.item_type} = 'USER' AND ${table.parentId} IS NULL) OR ${table.item_type} != 'USER'`,
      ),
      nullParentIsUserConstraint: check(
        "null_parent_is_user_constraint",
        sql`(${table.parentId} IS NULL AND ${table.item_type} = 'USER') OR ${table.parentId} IS NOT NULL`,
      ),
      coordUserGroupIdx: index("map_item_coord_user_group_idx").on(
        table.coord_user_id,
        table.coord_group_id,
      ),
      itemTypeIdx: index("map_item_item_type_idx").on(table.item_type),
      parentIdx: index("map_item_parent_idx").on(table.parentId),
      refItemIdx: index("map_item_ref_item_idx").on(table.refItemId),
      uniqueCoords: uniqueIndex("map_item_unique_coords_idx").on(
        table.coord_user_id,
        table.coord_group_id,
        table.path,
      ),
    };
  },
);

/**
 * MapItem type definitions
 */
export type MapItem = typeof mapItems.$inferSelect;
export type NewMapItem = typeof mapItems.$inferInsert;
