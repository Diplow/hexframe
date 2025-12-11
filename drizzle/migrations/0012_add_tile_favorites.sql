-- Migration: Add tile_favorites table for user bookmarks
-- Allows users to save tiles with custom shortcut names for quick access

CREATE TABLE IF NOT EXISTS "tile_favorites" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "map_item_id" text NOT NULL,
    "shortcut_name" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Foreign key to users table (cascade delete when user is deleted)
ALTER TABLE "tile_favorites" ADD CONSTRAINT "tile_favorites_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Unique constraint: each user can only have one favorite per shortcut name
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_shortcut" ON "tile_favorites" ("user_id", "shortcut_name");

-- Index for efficient lookup by user
CREATE INDEX IF NOT EXISTS "tile_favorites_user_id_idx" ON "tile_favorites" ("user_id");

-- Index for efficient lookup by map item
CREATE INDEX IF NOT EXISTS "tile_favorites_map_item_id_idx" ON "tile_favorites" ("map_item_id");
