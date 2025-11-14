import { describe, beforeEach, it, expect } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { schema } from "~/server/db";
import { _cleanupDatabase } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { MapItemType } from "~/lib/domains/mapping";

/**
 * Integration tests for composition migration to negative directions
 *
 * This migration transforms existing composition containers (direction 0) into negative direction children:
 * - Old model: parent → 0 → 1,2,3,4,5,6 (container with structural children)
 * - New model: parent → -1,-2,-3,-4,-5,-6 (composed children directly)
 *
 * These tests verify:
 * - Database schema supports negative integers in path arrays
 * - Migration script transforms existing direction 0 compositions correctly
 * - Parent-child relationships are preserved
 * - Hexagonal positioning is maintained (direction mapping)
 * - Migration is idempotent (can run multiple times safely)
 * - Edge cases are handled (empty compositions, deep nesting, root-level)
 */
describe("Migration: Composition to Negative Directions [Integration - DB]", () => {
  beforeEach(async () => {
    await _cleanupDatabase();
  });

  describe("Database Schema Support", () => {
    it("should support negative integers in path column", async () => {
      // Arrange - create a baseItem
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Test Item",
        content: "Test Content",
        link: "",
      }).returning();

      // Act - insert mapItem with negative direction in path
      const mapItem = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,-1", // Positive direction, then negative direction
        item_type: MapItemType.BASE,
        refItemId: baseItem[0]!.id,
      }).returning();

      // Assert - mapItem should be created with negative direction
      expect(mapItem[0]).toBeDefined();
      expect(mapItem[0]!.path).toBe("1,-1");
    });

    it("should support multiple negative directions in path", async () => {
      // Arrange
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Test Item",
        content: "Test Content",
        link: "",
      }).returning();

      // Act - insert mapItem with multiple negative directions
      const mapItem = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,-1,2,-2", // Mixed positive and negative
        item_type: MapItemType.BASE,
        refItemId: baseItem[0]!.id,
      }).returning();

      // Assert
      expect(mapItem[0]!.path).toBe("1,-1,2,-2");
    });

    it("should support all 6 negative direction values (-1 through -6)", async () => {
      // Arrange
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Test Item",
        content: "Test Content",
        link: "",
      }).returning();

      // Act - create items with each negative direction
      const negativeDirections = [-1, -2, -3, -4, -5, -6];
      const promises = negativeDirections.map((dir) =>
        db.insert(schema.mapItems).values({
          coord_user_id: 1,
          coord_group_id: 0,
          path: `${dir}`,
          item_type: MapItemType.BASE,
          refItemId: baseItem[0]!.id,
        }).returning()
      );

      const results = await Promise.all(promises);

      // Assert - all negative directions should be stored correctly
      expect(results).toHaveLength(6);
      results.forEach((result, index) => {
        expect(result[0]!.path).toBe(`${negativeDirections[index]}`);
      });
    });
  });

  describe("Migration: Simple Composition", () => {
    it("should transform direction 0 container with single child", async () => {
      // Arrange - create old model: parent → 0 → 1 (NorthWest)
      const { parentId, containerId, childId } = await _createOldModelComposition({
        parentPath: "1",
        containerPath: "1,0",
        childPath: "1,0,1", // Direction 1 = NorthWest
      });

      // Act - run migration
      await _runMigrationScript();

      // Assert - should transform to: parent → -1 (ComposedNorthWest)
      const parent = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, parentId),
      });
      const container = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, containerId),
      });
      const child = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, childId),
      });

      expect(parent).toBeDefined();
      expect(container).toBeUndefined(); // Container should be deleted
      expect(child).toBeDefined();
      expect(child!.path).toBe("1,-1"); // Transformed to negative direction
      expect(child!.parentId).toBe(parentId); // Parent relationship updated
    });

    it("should map all 6 structural directions to negative equivalents", async () => {
      // Arrange - create old model with all 6 directions
      const parentBaseItem = await db.insert(schema.baseItems).values({
        title: "Parent",
        content: "Parent Content",
        link: "",
      }).returning();

      const parent = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: parentBaseItem[0]!.id,
      }).returning();

      const containerBaseItem = await db.insert(schema.baseItems).values({
        title: "Container",
        content: "Container Content",
        link: "",
      }).returning();

      const container = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0",
        item_type: MapItemType.BASE,
        parentId: parent[0]!.id,
        refItemId: containerBaseItem[0]!.id,
      }).returning();

      // Create children in all 6 directions
      const directions = [1, 2, 3, 4, 5, 6]; // NorthWest, NorthEast, East, SouthEast, SouthWest, West
      const expectedNegative = [-1, -2, -3, -4, -5, -6];

      const childIds = [];
      for (const dir of directions) {
        const childBaseItem = await db.insert(schema.baseItems).values({
          title: `Child Direction ${dir}`,
          content: "Content",
          link: "",
        }).returning();

        const child = await db.insert(schema.mapItems).values({
          coord_user_id: 1,
          coord_group_id: 0,
          path: `1,0,${dir}`,
          item_type: MapItemType.BASE,
          parentId: container[0]!.id,
          refItemId: childBaseItem[0]!.id,
        }).returning();

        childIds.push(child[0]!.id);
      }

      // Act - run migration
      await _runMigrationScript();

      // Assert - verify all children transformed correctly
      for (let i = 0; i < childIds.length; i++) {
        const child = await db.query.mapItems.findFirst({
          where: eq(schema.mapItems.id, childIds[i]!),
        });
        expect(child).toBeDefined();
        expect(child!.path).toBe(`1,${expectedNegative[i]}`);
        expect(child!.parentId).toBe(parent[0]!.id);
      }
    });
  });

  describe("Migration: Edge Cases", () => {
    it("should handle empty composition (container with no children)", async () => {
      // Arrange - create container with no children
      const parentBaseItem = await db.insert(schema.baseItems).values({
        title: "Parent",
        content: "Content",
        link: "",
      }).returning();

      const parent = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: parentBaseItem[0]!.id,
      }).returning();

      const containerBaseItem = await db.insert(schema.baseItems).values({
        title: "Empty Container",
        content: "Content",
        link: "",
      }).returning();

      const container = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0",
        item_type: MapItemType.BASE,
        parentId: parent[0]!.id,
        refItemId: containerBaseItem[0]!.id,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - container should be deleted, parent remains
      const parentAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, parent[0]!.id),
      });
      const containerAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, container[0]!.id),
      });

      expect(parentAfter).toBeDefined();
      expect(containerAfter).toBeUndefined();
    });

    it("should handle root-level composition (path: [0])", async () => {
      // Arrange - create composition at root level
      const containerBaseItem = await db.insert(schema.baseItems).values({
        title: "Root Container",
        content: "Content",
        link: "",
      }).returning();

      const container = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "0",
        item_type: MapItemType.BASE,
        refItemId: containerBaseItem[0]!.id,
      }).returning();

      const childBaseItem = await db.insert(schema.baseItems).values({
        title: "Root Composed Child",
        content: "Content",
        link: "",
      }).returning();

      const child = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "0,1",
        item_type: MapItemType.BASE,
        parentId: container[0]!.id,
        refItemId: childBaseItem[0]!.id,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - child should become root-level composed child
      const childAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, child[0]!.id),
      });
      const containerAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, container[0]!.id),
      });

      expect(containerAfter).toBeUndefined();
      expect(childAfter).toBeDefined();
      expect(childAfter!.path).toBe("-1"); // Root level negative direction
      expect(childAfter!.parentId).toBeNull(); // No parent at root
    });

    it("should handle deeply nested compositions", async () => {
      // Arrange - create: 1 → 2 → 0 → 3 (deep nesting with composition)
      const baseItems = [];
      for (let i = 0; i < 4; i++) {
        const item = await db.insert(schema.baseItems).values({
          title: `Item ${i}`,
          content: "Content",
          link: "",
        }).returning();
        baseItems.push(item[0]!.id);
      }

      const level1 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: baseItems[0]!,
      }).returning();

      const level2 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,2",
        item_type: MapItemType.BASE,
        parentId: level1[0]!.id,
        refItemId: baseItems[1]!,
      }).returning();

      const container = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,2,0",
        item_type: MapItemType.BASE,
        parentId: level2[0]!.id,
        refItemId: baseItems[2]!,
      }).returning();

      const child = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,2,0,3",
        item_type: MapItemType.BASE,
        parentId: container[0]!.id,
        refItemId: baseItems[3]!,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - child should transform to negative direction
      const childAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, child[0]!.id),
      });

      expect(childAfter).toBeDefined();
      expect(childAfter!.path).toBe("1,2,-3"); // Direction 3 → -3
      expect(childAfter!.parentId).toBe(level2[0]!.id); // Parent is level2, not container
    });

    it("should handle multiple compositions in same tree", async () => {
      // Arrange - create tree with multiple composition points
      // Structure: root → [1,0→child1], [2,0→child2]
      const rootBase = await db.insert(schema.baseItems).values({
        title: "Root",
        content: "Content",
        link: "",
      }).returning();

      const root = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "",
        item_type: MapItemType.BASE,
        refItemId: rootBase[0]!.id,
      }).returning();

      // Branch 1 with composition
      const branch1Base = await db.insert(schema.baseItems).values({
        title: "Branch 1",
        content: "Content",
        link: "",
      }).returning();

      const branch1 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        parentId: root[0]!.id,
        refItemId: branch1Base[0]!.id,
      }).returning();

      const container1Base = await db.insert(schema.baseItems).values({
        title: "Container 1",
        content: "Content",
        link: "",
      }).returning();

      const container1 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0",
        item_type: MapItemType.BASE,
        parentId: branch1[0]!.id,
        refItemId: container1Base[0]!.id,
      }).returning();

      const child1Base = await db.insert(schema.baseItems).values({
        title: "Child 1",
        content: "Content",
        link: "",
      }).returning();

      const child1 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0,4",
        item_type: MapItemType.BASE,
        parentId: container1[0]!.id,
        refItemId: child1Base[0]!.id,
      }).returning();

      // Branch 2 with composition
      const branch2Base = await db.insert(schema.baseItems).values({
        title: "Branch 2",
        content: "Content",
        link: "",
      }).returning();

      const branch2 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "2",
        item_type: MapItemType.BASE,
        parentId: root[0]!.id,
        refItemId: branch2Base[0]!.id,
      }).returning();

      const container2Base = await db.insert(schema.baseItems).values({
        title: "Container 2",
        content: "Content",
        link: "",
      }).returning();

      const container2 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "2,0",
        item_type: MapItemType.BASE,
        parentId: branch2[0]!.id,
        refItemId: container2Base[0]!.id,
      }).returning();

      const child2Base = await db.insert(schema.baseItems).values({
        title: "Child 2",
        content: "Content",
        link: "",
      }).returning();

      const child2 = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "2,0,5",
        item_type: MapItemType.BASE,
        parentId: container2[0]!.id,
        refItemId: child2Base[0]!.id,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - both branches transformed
      const child1After = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, child1[0]!.id),
      });
      const child2After = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, child2[0]!.id),
      });

      expect(child1After!.path).toBe("1,-4");
      expect(child1After!.parentId).toBe(branch1[0]!.id);
      expect(child2After!.path).toBe("2,-5");
      expect(child2After!.parentId).toBe(branch2[0]!.id);
    });
  });

  describe("Migration: Idempotency", () => {
    it("should be safe to run migration multiple times", async () => {
      // Arrange - create old model composition
      const { parentId, childId } = await _createOldModelComposition({
        parentPath: "1",
        containerPath: "1,0",
        childPath: "1,0,1",
      });

      // Act - run migration twice
      await _runMigrationScript();
      await _runMigrationScript();

      // Assert - result should be the same
      const parent = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, parentId),
      });
      const child = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, childId),
      });

      expect(parent).toBeDefined();
      expect(child).toBeDefined();
      expect(child!.path).toBe("1,-1");
      expect(child!.parentId).toBe(parentId);

      // Verify only transformed items exist (no duplicates)
      const allItems = await db.query.mapItems.findMany({
        where: eq(schema.mapItems.coord_user_id, 1),
      });
      expect(allItems).toHaveLength(2); // Only parent and child
    });

    it("should not affect already-migrated negative direction items", async () => {
      // Arrange - create item with negative direction (already migrated)
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Already Migrated",
        content: "Content",
        link: "",
      }).returning();

      const item = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,-1",
        item_type: MapItemType.BASE,
        refItemId: baseItem[0]!.id,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - item should remain unchanged
      const itemAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, item[0]!.id),
      });

      expect(itemAfter).toBeDefined();
      expect(itemAfter!.path).toBe("1,-1"); // Unchanged
    });

    it("should not affect structural children (directions 1-6 without preceding 0)", async () => {
      // Arrange - create normal structural children
      const parentBase = await db.insert(schema.baseItems).values({
        title: "Parent",
        content: "Content",
        link: "",
      }).returning();

      const parent = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: parentBase[0]!.id,
      }).returning();

      const childBase = await db.insert(schema.baseItems).values({
        title: "Structural Child",
        content: "Content",
        link: "",
      }).returning();

      const child = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,2", // Direction 2 without preceding 0
        item_type: MapItemType.BASE,
        parentId: parent[0]!.id,
        refItemId: childBase[0]!.id,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - structural child unchanged
      const childAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, child[0]!.id),
      });

      expect(childAfter).toBeDefined();
      expect(childAfter!.path).toBe("1,2"); // Unchanged
      expect(childAfter!.parentId).toBe(parent[0]!.id);
    });
  });

  describe("Migration: Data Integrity", () => {
    it("should preserve grandchild relationships after migration", async () => {
      // Arrange - create: parent → 0 → 1 → 2 (composed child with its own child)
      const parentBase = await db.insert(schema.baseItems).values({
        title: "Parent",
        content: "Content",
        link: "",
      }).returning();

      const parent = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: parentBase[0]!.id,
      }).returning();

      const containerBase = await db.insert(schema.baseItems).values({
        title: "Container",
        content: "Content",
        link: "",
      }).returning();

      const container = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0",
        item_type: MapItemType.BASE,
        parentId: parent[0]!.id,
        refItemId: containerBase[0]!.id,
      }).returning();

      const childBase = await db.insert(schema.baseItems).values({
        title: "Composed Child",
        content: "Content",
        link: "",
      }).returning();

      const child = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0,1",
        item_type: MapItemType.BASE,
        parentId: container[0]!.id,
        refItemId: childBase[0]!.id,
      }).returning();

      const grandchildBase = await db.insert(schema.baseItems).values({
        title: "Grandchild",
        content: "Content",
        link: "",
      }).returning();

      const grandchild = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1,0,1,2",
        item_type: MapItemType.BASE,
        parentId: child[0]!.id,
        refItemId: grandchildBase[0]!.id,
      }).returning();

      // Act - run migration
      await _runMigrationScript();

      // Assert - grandchild relationship preserved
      const childAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, child[0]!.id),
      });
      const grandchildAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, grandchild[0]!.id),
      });

      expect(childAfter!.path).toBe("1,-1");
      expect(childAfter!.parentId).toBe(parent[0]!.id);
      expect(grandchildAfter!.path).toBe("1,-1,2");
      expect(grandchildAfter!.parentId).toBe(child[0]!.id);
    });

    it("should preserve baseItem references", async () => {
      // Arrange
      const { parentId, childId } = await _createOldModelComposition({
        parentPath: "1",
        containerPath: "1,0",
        childPath: "1,0,1",
      });

      const childBefore = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, childId),
      });
      const originalRefItemId = childBefore!.refItemId;

      // Act - run migration
      await _runMigrationScript();

      // Assert - baseItem reference unchanged
      const childAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, childId),
      });

      expect(childAfter!.refItemId).toBe(originalRefItemId);
    });

    it("should preserve timestamps", async () => {
      // Arrange
      const { childId } = await _createOldModelComposition({
        parentPath: "1",
        containerPath: "1,0",
        childPath: "1,0,1",
      });

      const childBefore = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, childId),
      });
      const originalCreatedAt = childBefore!.createdAt;

      // Small delay to ensure timestamps would differ if recreated
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act - run migration
      await _runMigrationScript();

      // Assert - timestamps preserved (not recreated)
      const childAfter = await db.query.mapItems.findFirst({
        where: eq(schema.mapItems.id, childId),
      });

      expect(childAfter!.createdAt).toEqual(originalCreatedAt);
    });
  });

  // Helper functions (prefixed with _ for internal use)
  async function _createOldModelComposition(params: {
    parentPath: string;
    containerPath: string;
    childPath: string;
  }) {
    const { parentPath, containerPath, childPath } = params;

    const parentBase = await db.insert(schema.baseItems).values({
      title: "Parent",
      content: "Parent Content",
      link: "",
    }).returning();

    const parent = await db.insert(schema.mapItems).values({
      coord_user_id: 1,
      coord_group_id: 0,
      path: parentPath,
      item_type: MapItemType.BASE,
      refItemId: parentBase[0]!.id,
    }).returning();

    const containerBase = await db.insert(schema.baseItems).values({
      title: "Composition Container",
      content: "Container Content",
      link: "",
    }).returning();

    const container = await db.insert(schema.mapItems).values({
      coord_user_id: 1,
      coord_group_id: 0,
      path: containerPath,
      item_type: MapItemType.BASE,
      parentId: parent[0]!.id,
      refItemId: containerBase[0]!.id,
    }).returning();

    const childBase = await db.insert(schema.baseItems).values({
      title: "Composed Child",
      content: "Child Content",
      link: "",
    }).returning();

    const child = await db.insert(schema.mapItems).values({
      coord_user_id: 1,
      coord_group_id: 0,
      path: childPath,
      item_type: MapItemType.BASE,
      parentId: container[0]!.id,
      refItemId: childBase[0]!.id,
    }).returning();

    return {
      parentId: parent[0]!.id,
      containerId: container[0]!.id,
      childId: child[0]!.id,
    };
  }

  async function _runMigrationScript() {
    // Execute the migration SQL script
    await db.execute(sql`
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
          -- Get parent path (everything before ',0')
          IF container_record.path = '0' THEN
            parent_path := '';
          ELSE
            parent_path := substring(container_record.path from '^(.+),0$');
          END IF;

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
            -- Extract the direction from child's path (last element)
            child_direction := CAST(
              substring(child_record.path from '[^,]+$') AS INTEGER
            );

            -- Build new path: parent_path + negative_direction
            IF parent_path = '' THEN
              new_path := CAST(-child_direction AS TEXT);
            ELSE
              new_path := parent_path || ',' || CAST(-child_direction AS TEXT);
            END IF;

            -- Store old and new path prefixes for descendants
            old_path_prefix := child_record.path;
            new_path_prefix := new_path;

            -- Update child: new path, new parent
            UPDATE vde_map_items
            SET
              path = new_path,
              parent_id = container_record.parent_id
            WHERE id = child_record.id;

            -- Update all descendants: replace old path prefix with new path prefix
            -- This handles grandchildren and deeper descendants
            FOR descendant_record IN
              SELECT id, path
              FROM vde_map_items
              WHERE path LIKE old_path_prefix || ',%'
            LOOP
              UPDATE vde_map_items
              SET path = new_path_prefix || substring(descendant_record.path from length(old_path_prefix) + 1)
              WHERE id = descendant_record.id;
            END LOOP;
          END LOOP;

          -- Delete the container after all children are migrated
          DELETE FROM vde_map_items WHERE id = container_record.id;
        END LOOP;
      END $$;
    `);
  }
});
