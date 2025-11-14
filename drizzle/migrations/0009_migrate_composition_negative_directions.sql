-- Migration: Transform composition containers (direction 0) to negative direction format
-- This migration is idempotent and safe to run multiple times
--
-- Transformation:
-- Old: parent → 0 → 1,2,3,4,5,6 (container with structural children)
-- New: parent → -1,-2,-3,-4,-5,-6 (composed children directly)
--
-- Direction mapping:
-- 1 (NorthWest) → -1 (ComposedNorthWest)
-- 2 (NorthEast) → -2 (ComposedNorthEast)
-- 3 (East) → -3 (ComposedEast)
-- 4 (SouthEast) → -4 (ComposedSouthEast)
-- 5 (SouthWest) → -5 (ComposedSouthWest)
-- 6 (West) → -6 (ComposedWest)

DO $$
DECLARE
  container_record RECORD;
  child_record RECORD;
  descendant_record RECORD;
  new_path TEXT;
  parent_path TEXT;
  child_direction INTEGER;
  old_path_prefix TEXT;
  new_path_prefix TEXT;
BEGIN
  -- Find all composition containers (paths containing ',0')
  -- Process from deepest to shallowest to avoid parent-child conflicts
  FOR container_record IN
    SELECT
      id,
      path,
      parent_id,
      coord_user_id,
      coord_group_id,
      array_length(string_to_array(path, ','), 1) as depth
    FROM vde_map_items
    WHERE path LIKE '%,0' OR path = '0'
    ORDER BY depth DESC NULLS LAST
  LOOP
    RAISE NOTICE 'Processing container: id=%, path=%', container_record.id, container_record.path;

    -- Get parent path (everything before ',0')
    IF container_record.path = '0' THEN
      parent_path := '';
    ELSE
      parent_path := substring(container_record.path from '^(.+),0$');
    END IF;

    RAISE NOTICE '  Parent path: %', parent_path;

    -- Process all children of this container
    FOR child_record IN
      SELECT
        id,
        path,
        parent_id,
        ref_item_id,
        item_type,
        coord_user_id,
        coord_group_id,
        created_at,
        updated_at
      FROM vde_map_items
      WHERE parent_id = container_record.id
    LOOP
      RAISE NOTICE '  Processing child: id=%, path=%', child_record.id, child_record.path;

      -- Extract the direction from child's path (last element)
      -- Child path format: parent,0,X where X is direction 1-6
      child_direction := CAST(
        substring(child_record.path from '[^,]+$') AS INTEGER
      );

      RAISE NOTICE '    Child direction: %', child_direction;

      -- Build new path: parent_path + negative_direction
      IF parent_path = '' THEN
        new_path := CAST(-child_direction AS TEXT);
      ELSE
        new_path := parent_path || ',' || CAST(-child_direction AS TEXT);
      END IF;

      RAISE NOTICE '    New path: %', new_path;

      -- Store old and new path prefixes for descendants
      old_path_prefix := child_record.path;
      new_path_prefix := new_path;

      -- Update child: new path, new parent
      UPDATE vde_map_items
      SET
        path = new_path,
        parent_id = container_record.parent_id
      WHERE id = child_record.id;

      RAISE NOTICE '    Updated child with new path and parent';

      -- Update all descendants: replace old path prefix with new path prefix
      -- This handles grandchildren and deeper descendants
      FOR descendant_record IN
        SELECT id, path
        FROM vde_map_items
        WHERE path LIKE old_path_prefix || ',%'
      LOOP
        RAISE NOTICE '      Updating descendant: id=%, old path=%, new path=%',
          descendant_record.id,
          descendant_record.path,
          new_path_prefix || substring(descendant_record.path from length(old_path_prefix) + 1);

        UPDATE vde_map_items
        SET path = new_path_prefix || substring(descendant_record.path from length(old_path_prefix) + 1)
        WHERE id = descendant_record.id;
      END LOOP;
    END LOOP;

    -- Delete the container after all children are migrated
    DELETE FROM vde_map_items WHERE id = container_record.id;
    RAISE NOTICE '  Deleted container: id=%', container_record.id;

  END LOOP;

  RAISE NOTICE 'Migration complete';
END $$;
