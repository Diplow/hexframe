-- Migration: Add template_name column to map_items
--
-- This column stores the name of the template a tile was created from.
-- When a tile is instantiated from a template, the template's name is recorded
-- to track provenance and enable features like "created from template X".
--
-- The column is nullable because most tiles are not created from templates.

ALTER TABLE vde_map_items
ADD COLUMN template_name VARCHAR(255);

-- Optional: Add an index for querying tiles by template
-- CREATE INDEX IF NOT EXISTS map_item_template_name_idx ON vde_map_items(template_name);
