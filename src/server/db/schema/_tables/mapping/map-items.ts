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

/**
 * Map Items table - stores hexagonal coordinate references to base items
 *
 * Path Column Format:
 * - Stored as varchar(255) containing comma-separated integers
 * - Empty string ("") represents the root coordinate
 * - Positive directions (1-6): Structural children around a hex
 *   - 1=NorthWest, 2=NorthEast, 3=East, 4=SouthEast, 5=SouthWest, 6=West
 * - Zero direction (0): Composition container (center of a hex)
 * - Negative directions (-1 to -6): Composed children within a hex
 *   - -1=ComposedNorthWest, -2=ComposedNorthEast, -3=ComposedEast,
 *   - -4=ComposedSouthEast, -5=ComposedSouthWest, -6=ComposedWest
 *
 * Examples:
 * - "": root coordinate (user's center hex)
 * - "1,2,3": path through NorthWest → NorthEast → East
 * - "1,0,-3": NorthWest → Composition → ComposedEast (zoomed into composition)
 * - "1,-3,2": NorthWest → ComposedEast → NorthEast (mixed structural and composed)
 *
 * The varchar(255) length supports paths with ~50-80 directions depending on
 * the number of negative directions (which require 2-3 chars each including comma).
 */
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
    parentId: integer("parent_id"),
    refItemId: integer("ref_item_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table): PgTableExtraConfig => {
    return {
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
