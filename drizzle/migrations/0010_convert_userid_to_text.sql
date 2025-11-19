-- Migration: Convert coord_user_id from integer to text (string UUID)
-- This eliminates the need for user_mapping table and uses better-auth's native string IDs

-- Step 1: Add new text column for user IDs
ALTER TABLE "vde_map_items" ADD COLUMN "coord_user_id_text" text;

-- Step 2: Populate the new column by looking up auth_user_id from user_mapping
UPDATE "vde_map_items"
SET "coord_user_id_text" = (
  SELECT "auth_user_id"
  FROM "vde_user_mapping"
  WHERE "mapping_user_id" = "vde_map_items"."coord_user_id"
);

-- Step 3: Verify all rows were migrated (should return 0)
-- If this returns > 0, there are map_items with no corresponding user_mapping entry
DO $$
DECLARE
  unmapped_count integer;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM "vde_map_items"
  WHERE "coord_user_id_text" IS NULL;

  IF unmapped_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % map_items have no corresponding user_mapping entry', unmapped_count;
  END IF;
END $$;

-- Step 4: Make the new column NOT NULL (now that we've verified all rows are populated)
ALTER TABLE "vde_map_items" ALTER COLUMN "coord_user_id_text" SET NOT NULL;

-- Step 5: Drop the old integer column and indexes that reference it
DROP INDEX IF EXISTS "map_item_coord_user_group_idx";
DROP INDEX IF EXISTS "map_item_unique_coords_idx";
ALTER TABLE "vde_map_items" DROP COLUMN "coord_user_id";

-- Step 6: Rename the new column to the original name
ALTER TABLE "vde_map_items" RENAME COLUMN "coord_user_id_text" TO "coord_user_id";

-- Step 7: Recreate indexes with the new text column
CREATE INDEX "map_item_coord_user_group_idx" ON "vde_map_items" ("coord_user_id", "coord_group_id");
CREATE UNIQUE INDEX "map_item_unique_coords_idx" ON "vde_map_items" ("coord_user_id", "coord_group_id", "path");

-- Step 8: Drop the user_mapping table (no longer needed)
DROP TABLE IF EXISTS "vde_user_mapping";

-- Step 9: Update the sequence cleanup if needed
-- Note: The user_mapping sequence will be automatically dropped with the table
