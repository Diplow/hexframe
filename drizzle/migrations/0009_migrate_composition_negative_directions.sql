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
--
-- Content Preservation:
-- Containers with meaningful content are preserved as direction 0 children
-- Only placeholder/empty containers are deleted

DO $$
DECLARE
  container_record RECORD;
  child_record RECORD;
  descendant_record RECORD;
  base_item_record RECORD;
  new_path TEXT;
  parent_path TEXT;
  child_direction INTEGER;
  old_path_prefix TEXT;
  new_path_prefix TEXT;
  has_meaningful_content BOOLEAN;
  has_children BOOLEAN;
BEGIN
  -- Find all composition containers (paths containing ',0')
  -- Process from deepest to shallowest to avoid parent-child conflicts
  FOR container_record IN
    SELECT
      id,
      path,
      parent_id,
      ref_item_id,
      coord_user_id,
      coord_group_id,
      array_length(string_to_array(path, ','), 1) as depth
    FROM vde_map_items
    WHERE path LIKE '%,0' OR path = '0'
    ORDER BY depth DESC NULLS LAST
  LOOP
    RAISE NOTICE 'Processing container: id=%, path=%', container_record.id, container_record.path;

    -- Check if container has children
    SELECT EXISTS(
      SELECT 1 FROM vde_map_items WHERE parent_id = container_record.id
    ) INTO has_children;

    -- Check if container has meaningful content (if it has a base_item reference)
    has_meaningful_content := FALSE;
    IF container_record.ref_item_id IS NOT NULL THEN
      SELECT
        bi.title,
        bi.content,
        bi.preview,
        bi.link
      INTO base_item_record
      FROM vde_base_items bi
      WHERE bi.id = container_record.ref_item_id;

      -- Consider content meaningful if:
      -- 1. Content is not empty/placeholder text
      -- 2. Title is not a generic placeholder
      -- 3. Has preview or link
      IF base_item_record.content IS NOT NULL
         AND base_item_record.content != ''
         AND base_item_record.content NOT IN ('Container Content', 'Content', 'Composition Container')
      THEN
        has_meaningful_content := TRUE;
      END IF;

      IF base_item_record.preview IS NOT NULL AND base_item_record.preview != '' THEN
        has_meaningful_content := TRUE;
      END IF;

      IF base_item_record.link IS NOT NULL AND base_item_record.link != '' THEN
        has_meaningful_content := TRUE;
      END IF;

      -- Also check title for non-placeholder content
      IF base_item_record.title IS NOT NULL
         AND base_item_record.title NOT IN ('Container', 'Composition Container', 'Empty Container', 'Root Container')
      THEN
        has_meaningful_content := TRUE;
      END IF;
    END IF;

    RAISE NOTICE '  Has children: %, Has meaningful content: %', has_children, has_meaningful_content;

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
      -- Child path format: parent,0,X where X is direction 1-6 or 0 (nested)
      child_direction := CAST(
        substring(child_record.path from '[^,]+$') AS INTEGER
      );

      RAISE NOTICE '    Child direction: %', child_direction;

      -- Skip direction-0 children (nested composition containers)
      -- These will be processed in their own iteration
      IF child_direction = 0 THEN
        RAISE NOTICE '    Skipping nested direction-0 child (will be processed separately)';
        CONTINUE;
      END IF;

      -- Skip children that are already negative (already migrated)
      -- This prevents double-negation when nested containers are involved
      IF child_direction < 0 THEN
        RAISE NOTICE '    Skipping already-negative child (already migrated): direction=%', child_direction;
        CONTINUE;
      END IF;

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

    -- Decision: Delete container or preserve it?
    IF has_meaningful_content AND NOT has_children THEN
      -- Container has content but no children - keep it as direction 0
      RAISE NOTICE '  Preserving container with content: id=%, path=%', container_record.id, container_record.path;
    ELSIF has_meaningful_content AND has_children THEN
      -- Container has both content and children - this is unusual but preserve content
      -- by keeping the direction 0 node
      RAISE NOTICE '  Preserving container with content and children: id=%, path=%', container_record.id, container_record.path;
    ELSE
      -- Container is empty/placeholder - safe to delete
      RAISE NOTICE '  Deleting empty container: id=%', container_record.id;

      -- Delete the container map item
      DELETE FROM vde_map_items WHERE id = container_record.id;

      -- Optionally clean up orphaned base_item if it exists and is a placeholder
      IF container_record.ref_item_id IS NOT NULL THEN
        -- Check if this base_item is still referenced by other map_items
        IF NOT EXISTS(
          SELECT 1 FROM vde_map_items WHERE ref_item_id = container_record.ref_item_id
        ) THEN
          RAISE NOTICE '  Deleting orphaned base_item: id=%', container_record.ref_item_id;
          DELETE FROM vde_base_items WHERE id = container_record.ref_item_id;
        END IF;
      END IF;
    END IF;

  END LOOP;

  RAISE NOTICE 'Migration complete';
END $$;