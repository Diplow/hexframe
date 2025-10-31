-- Migration: Move originId from mapItems to baseItems for proper content lineage tracking
-- This migration is idempotent and safe to run multiple times

-- Drop unique constraint if it exists (schema drift from previous migrations)
DO $$ BEGIN
  ALTER TABLE "vde_base_item_versions" DROP CONSTRAINT IF EXISTS "vde_base_item_versions_base_item_id_version_number_unique";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint

-- Recreate unique constraint on base_item_versions (baseItemId, versionNumber)
DO $$ BEGIN
  ALTER TABLE "vde_base_item_versions" ADD CONSTRAINT "vde_base_item_versions_base_item_id_version_number_unique"
    UNIQUE ("base_item_id", "version_number");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Drop originId FK from map_items if it exists
DO $$ BEGIN
  ALTER TABLE "vde_map_items" DROP CONSTRAINT IF EXISTS "vde_map_items_origin_id_vde_map_items_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint

-- Drop old index if it exists (schema drift from previous migrations)
DROP INDEX IF EXISTS "vde_base_item_versions_base_item_id_idx";
--> statement-breakpoint

-- Add origin_id column to base_items if it doesn't exist
DO $$ BEGIN
  ALTER TABLE "vde_base_items" ADD COLUMN IF NOT EXISTS "origin_id" integer;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint

-- Add self-referential FK for base_items.origin_id
DO $$ BEGIN
  ALTER TABLE "vde_base_items" ADD CONSTRAINT "vde_base_items_origin_id_vde_base_items_id_fk"
    FOREIGN KEY ("origin_id") REFERENCES "public"."vde_base_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Create index on origin_id for efficient lineage queries
CREATE INDEX IF NOT EXISTS "base_item_origin_id_idx" ON "vde_base_items" USING btree ("origin_id");
--> statement-breakpoint

-- Drop origin_id column from map_items if it exists
DO $$ BEGIN
  ALTER TABLE "vde_map_items" DROP COLUMN IF EXISTS "origin_id";
EXCEPTION
  WHEN undefined_column THEN null;
END $$;
--> statement-breakpoint

-- Add check constraint to prevent self-reference
DO $$ BEGIN
  ALTER TABLE "vde_base_items" ADD CONSTRAINT "base_item_no_self_reference"
    CHECK ("vde_base_items"."origin_id" IS NULL OR "vde_base_items"."origin_id" != "vde_base_items"."id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;