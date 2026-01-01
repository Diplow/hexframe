-- Migration: Extend MapItemType with semantic values (organizational, context, system)
--
-- This migration extends the item_type column from binary classification (user/base)
-- to semantic classification that enables type-aware agent behavior:
--   - user: Root tile for each user's map (unchanged)
--   - organizational: Structural grouping (e.g., "Plans", "Interests")
--   - context: Reference material to explore on-demand
--   - system: Executable capability to invoke like a skill
--
-- Migration strategy:
--   1. Favorited tiles (in tile_favorites) -> 'system' (user deemed them important skills)
--   2. All descendants of favorited tiles -> 'system' (inherit parent's semantic type)
--   3. All other BASE tiles -> 'context' (default for unclassified tiles)
--   4. USER tiles -> unchanged
--
-- Users can later manually set organizational tiles through the UI.

DO $$
DECLARE
  favorited_map_item_ids INTEGER[];
  descendant_ids INTEGER[];
  all_system_ids INTEGER[];
BEGIN
  -- Step 1: Find all favorited map item IDs
  SELECT ARRAY_AGG(DISTINCT map_item_id) INTO favorited_map_item_ids
  FROM tile_favorites;

  -- Handle case where no favorites exist
  IF favorited_map_item_ids IS NULL THEN
    favorited_map_item_ids := ARRAY[]::INTEGER[];
  END IF;

  RAISE NOTICE 'Found % favorited tiles', COALESCE(array_length(favorited_map_item_ids, 1), 0);

  -- Step 2: Find all descendants of favorited tiles using recursive CTE
  WITH RECURSIVE descendants AS (
    -- Base case: favorited tiles themselves
    SELECT id FROM vde_map_items WHERE id = ANY(favorited_map_item_ids)
    UNION
    -- Recursive case: children of current set
    SELECT m.id
    FROM vde_map_items m
    INNER JOIN descendants d ON m.parent_id = d.id
  )
  SELECT ARRAY_AGG(id) INTO all_system_ids FROM descendants;

  -- Handle case where no system tiles exist
  IF all_system_ids IS NULL THEN
    all_system_ids := ARRAY[]::INTEGER[];
  END IF;

  RAISE NOTICE 'Total tiles to mark as system (favorites + descendants): %', COALESCE(array_length(all_system_ids, 1), 0);

  -- Step 3: Update tiles to new semantic types

  -- 3a. Mark favorited tiles and their descendants as 'system'
  UPDATE vde_map_items
  SET item_type = 'system', updated_at = NOW()
  WHERE id = ANY(all_system_ids)
    AND item_type != 'user';  -- Don't change USER type tiles

  -- 3b. Mark all remaining BASE tiles as 'context'
  UPDATE vde_map_items
  SET item_type = 'context', updated_at = NOW()
  WHERE item_type = 'base';

  RAISE NOTICE 'Migration complete: tiles updated to semantic types';
END $$;

-- Verification query (commented out, run manually to verify):
-- SELECT item_type, COUNT(*) as count
-- FROM vde_map_items
-- GROUP BY item_type
-- ORDER BY item_type;
