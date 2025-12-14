import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "~/server/db/schema/_tables/auth/users";
import { mapItems } from "~/server/db/schema/_tables/mapping/map-items";

/**
 * Tile Favorites table - stores user-defined shortcut names for quick tile access
 *
 * Allows users to bookmark tiles with memorable shortcut names.
 * Shortcut names are case-insensitive and must be alphanumeric + underscore only.
 *
 * Note: The foreign key to mapItems is defined at the database schema level,
 * but the IAM domain layer treats mapItemId as an opaque integer ID.
 * The router layer handles enrichment with map item data (coordinates, titles, etc.)
 *
 * Examples:
 * - "my_project" -> user's main project tile
 * - "work_tasks" -> work-related tile
 * - "learning_ai" -> AI learning resources tile
 */
export const tileFavorites = pgTable("tile_favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mapItemId: integer("map_item_id")
    .notNull()
    .references(() => mapItems.id, { onDelete: "cascade" }),
  shortcutName: text("shortcut_name").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  uniqueUserShortcut: uniqueIndex("unique_user_shortcut")
    .on(table.userId, table.shortcutName),
  userIdIdx: index("tile_favorites_user_id_idx").on(table.userId),
  mapItemIdIdx: index("tile_favorites_map_item_id_idx").on(table.mapItemId),
}));

export type TileFavorite = typeof tileFavorites.$inferSelect;
export type NewTileFavorite = typeof tileFavorites.$inferInsert;
