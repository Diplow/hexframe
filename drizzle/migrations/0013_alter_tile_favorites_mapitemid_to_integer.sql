-- Migration: Convert tile_favorites.map_item_id from coordinate string (text) to database ID (integer)
-- This enables proper foreign key relationship to vde_map_items
--
-- The old format stored coordinate strings like "userId,groupId:path"
-- The new format stores the integer ID from vde_map_items

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE "tile_favorites" DROP CONSTRAINT IF EXISTS "tile_favorites_map_item_id_vde_map_items_id_fk";

-- Drop the index to allow column changes
DROP INDEX IF EXISTS "tile_favorites_map_item_id_idx";

-- Add a new integer column for the map_item_id
ALTER TABLE "tile_favorites" ADD COLUMN "map_item_id_new" integer;

-- Migrate data by parsing the coordinate string and looking up the actual ID
-- Format: 'userId,groupId:path' e.g., 'fZRHqrORpUkoV14TRmtW0GA5kFV7UN0X,0:6'
UPDATE "tile_favorites" f
SET "map_item_id_new" = m.id
FROM "vde_map_items" m
WHERE
    -- Parse the userId (everything before the first comma)
    m.coord_user_id = split_part(f.map_item_id, ',', 1)
    -- Parse the groupId (between first comma and colon)
    AND m.coord_group_id = split_part(split_part(f.map_item_id, ',', 2), ':', 1)::integer
    -- Parse the path (everything after the colon)
    AND m.path = split_part(f.map_item_id, ':', 2);

-- Drop the old text column
ALTER TABLE "tile_favorites" DROP COLUMN "map_item_id";

-- Rename the new column
ALTER TABLE "tile_favorites" RENAME COLUMN "map_item_id_new" TO "map_item_id";

-- Make it NOT NULL
ALTER TABLE "tile_favorites" ALTER COLUMN "map_item_id" SET NOT NULL;

-- Add the foreign key constraint
ALTER TABLE "tile_favorites" ADD CONSTRAINT "tile_favorites_map_item_id_vde_map_items_id_fk"
    FOREIGN KEY ("map_item_id") REFERENCES "public"."vde_map_items"("id") ON DELETE cascade ON UPDATE no action;

-- Re-create the index
CREATE INDEX IF NOT EXISTS "tile_favorites_map_item_id_idx" ON "tile_favorites" ("map_item_id");
