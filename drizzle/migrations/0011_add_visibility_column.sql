-- Migration: Add visibility column to vde_map_items
-- Enables public/private tile visibility with privacy-first default

-- Add visibility column with default 'private' (NOT NULL with default auto-populates existing rows)
ALTER TABLE "vde_map_items" ADD COLUMN "visibility" varchar(20) NOT NULL DEFAULT 'private';

-- Create index for efficient visibility filtering queries
CREATE INDEX "map_item_visibility_idx" ON "vde_map_items" ("visibility");
