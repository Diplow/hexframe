-- Migration: Convert tile_favorites.map_item_id from coordinate string (text) to database ID (integer)
-- This enables proper foreign key relationship to vde_map_items
--
-- NOTE: This migration is now a NO-OP because migration 0012 was updated to create
-- map_item_id as integer from the start. This migration is kept for journal consistency
-- but only runs the conversion if the column is still text type.

DO $$
BEGIN
    -- Only run conversion if map_item_id is text type (not already integer)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tile_favorites'
        AND column_name = 'map_item_id'
        AND data_type = 'text'
    ) THEN
        -- Drop existing constraints
        ALTER TABLE "tile_favorites" DROP CONSTRAINT IF EXISTS "tile_favorites_map_item_id_vde_map_items_id_fk";
        DROP INDEX IF EXISTS "tile_favorites_map_item_id_idx";

        -- Add new integer column
        ALTER TABLE "tile_favorites" ADD COLUMN "map_item_id_new" integer;

        -- Migrate data by parsing coordinate strings
        UPDATE "tile_favorites" f
        SET "map_item_id_new" = m.id
        FROM "vde_map_items" m
        WHERE m.coord_user_id = split_part(f.map_item_id::text, ',', 1)
            AND m.coord_group_id = split_part(split_part(f.map_item_id::text, ',', 2), ':', 1)::integer
            AND m.path = split_part(f.map_item_id::text, ':', 2);

        -- Swap columns
        ALTER TABLE "tile_favorites" DROP COLUMN "map_item_id";
        ALTER TABLE "tile_favorites" RENAME COLUMN "map_item_id_new" TO "map_item_id";
        ALTER TABLE "tile_favorites" ALTER COLUMN "map_item_id" SET NOT NULL;

        -- Re-add constraints
        ALTER TABLE "tile_favorites" ADD CONSTRAINT "tile_favorites_map_item_id_vde_map_items_id_fk"
            FOREIGN KEY ("map_item_id") REFERENCES "public"."vde_map_items"("id") ON DELETE cascade ON UPDATE no action;
        CREATE INDEX IF NOT EXISTS "tile_favorites_map_item_id_idx" ON "tile_favorites" ("map_item_id");

        RAISE NOTICE 'Migration 0013: Converted map_item_id from text to integer';
    ELSE
        RAISE NOTICE 'Migration 0013: map_item_id is already integer, skipping conversion';
    END IF;
END $$;
