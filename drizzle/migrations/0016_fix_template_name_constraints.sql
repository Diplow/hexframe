-- Migration: Fix template_name column constraints
--
-- The template_name column was initially created with VARCHAR(255) and no unique constraint.
-- Per TEMPLATES_AS_TILES.md spec, it should be VARCHAR(100) with a unique constraint.
--
-- This migration:
-- 1. Adds a UNIQUE constraint on template_name
-- 2. Changes the column length from 255 to 100

-- Add unique constraint (NULL values are allowed and don't violate uniqueness)
ALTER TABLE vde_map_items
ADD CONSTRAINT unique_template_name UNIQUE (template_name);

-- Change column length from 255 to 100
ALTER TABLE vde_map_items
ALTER COLUMN template_name TYPE VARCHAR(100);
