import { describe, beforeEach, it, expect } from "vitest";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "~/server/db";
import { schema } from "~/server/db";
import { _cleanupDatabase } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { MapItemType } from "~/lib/domains/mapping";

/**
 * Integration tests for originId lineage migration
 *
 * This migration:
 * 1. Removes mapItems.originId (lineage tracking at wrong layer)
 * 2. Adds baseItems.originId with self-referential FK (proper content lineage)
 *
 * These tests verify:
 * - mapItems.originId column no longer exists
 * - baseItems.originId column exists with proper constraints
 * - Self-referential FK works correctly
 * - Cascade delete behavior is correct
 * - NULL originId is allowed (for original content)
 */
describe("Migration: originId Lineage Tracking [Integration - DB]", () => {
  beforeEach(async () => {
    await _cleanupDatabase();
  });

  describe("mapItems.originId Removal", () => {
    it("should not have originId column in mapItems table", async () => {
      // Arrange - create a map item
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Test Item",
        content: "Test Content",
        link: "",
      }).returning();

      const mapItem = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: baseItem[0]!.id,
      }).returning();

      // Assert - mapItem should not have originId property
      expect(mapItem[0]).toBeDefined();
      expect('originId' in mapItem[0]!).toBe(false);
    });

    it("should ignore originId property when inserting mapItem (TypeScript prevents this)", async () => {
      // Arrange
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Test Item",
        content: "Test Content",
        link: "",
      }).returning();

      // Act - TypeScript prevents this at compile time, but if we bypass with 'as any'
      // the runtime should just ignore the unknown property
      const mapItem = await db.insert(schema.mapItems).values({
        coord_user_id: 1,
        coord_group_id: 0,
        path: "1",
        item_type: MapItemType.BASE,
        refItemId: baseItem[0]!.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originId: 999,
      } as any).returning();

      // Assert - mapItem should be created successfully without originId
      expect(mapItem[0]).toBeDefined();
      expect('originId' in mapItem[0]!).toBe(false);
    });
  });

  describe("baseItems.originId Addition", () => {
    it("should allow creating baseItem with NULL originId (original content)", async () => {
      // Act - create baseItem without originId
      const baseItem = await db.insert(schema.baseItems).values({
        title: "Original Content",
        content: "This is original content",
        link: "",
      }).returning();

      // Assert
      expect(baseItem[0]).toBeDefined();
      expect(baseItem[0]!.originId).toBeNull();
    });

    it("should allow creating baseItem with originId referencing another baseItem", async () => {
      // Arrange - create original baseItem
      const original = await db.insert(schema.baseItems).values({
        title: "Original",
        content: "Original content",
        link: "",
      }).returning();

      // Act - create derived baseItem with originId
      const derived = await db.insert(schema.baseItems).values({
        title: "Derived from Original",
        content: "Copied and modified content",
        originId: original[0]!.id,
        link: "",
      }).returning();

      // Assert
      expect(derived[0]).toBeDefined();
      expect(derived[0]!.originId).toBe(original[0]!.id);
    });

    it("should fail when originId references non-existent baseItem", async () => {
      // Act & Assert - should fail with FK constraint violation
      await expect(
        db.insert(schema.baseItems).values({
          title: "Invalid Origin",
          content: "Content",
          originId: 99999, // Non-existent ID
          link: "",
        }).returning()
      ).rejects.toThrow();
    });

    it("should support self-referential lineage chains", async () => {
      // Arrange - create original
      const v1 = await db.insert(schema.baseItems).values({
        title: "Version 1",
        content: "Original content",
        link: "",
      }).returning();

      // Act - create chain: v1 -> v2 -> v3
      const v2 = await db.insert(schema.baseItems).values({
        title: "Version 2",
        content: "Modified content",
        originId: v1[0]!.id,
        link: "",
      }).returning();

      const v3 = await db.insert(schema.baseItems).values({
        title: "Version 3",
        content: "Further modified content",
        originId: v2[0]!.id,
        link: "",
      }).returning();

      // Assert - verify chain
      expect(v2[0]!.originId).toBe(v1[0]!.id);
      expect(v3[0]!.originId).toBe(v2[0]!.id);

      // Query to verify chain integrity
      const v2WithOrigin = await db.query.baseItems.findFirst({
        where: eq(schema.baseItems.id, v2[0]!.id),
      });
      expect(v2WithOrigin!.originId).toBe(v1[0]!.id);
    });

    it("should prevent circular references (baseItem cannot reference itself)", async () => {
      // Arrange - create a baseItem
      const item = await db.insert(schema.baseItems).values({
        title: "Test",
        content: "Content",
        link: "",
      }).returning();

      // Act & Assert - try to update to reference itself
      await expect(
        db.update(schema.baseItems)
          .set({ originId: item[0]!.id })
          .where(eq(schema.baseItems.id, item[0]!.id))
      ).rejects.toThrow();
    });
  });

  describe("Cascade Delete Behavior", () => {
    it("should SET NULL when origin baseItem is deleted", async () => {
      // Arrange - create lineage: original -> derived
      const original = await db.insert(schema.baseItems).values({
        title: "Original",
        content: "Original content",
        link: "",
      }).returning();

      const derived = await db.insert(schema.baseItems).values({
        title: "Derived",
        content: "Derived content",
        originId: original[0]!.id,
        link: "",
      }).returning();

      // Act - delete original
      await db.delete(schema.baseItems)
        .where(eq(schema.baseItems.id, original[0]!.id));

      // Assert - derived should still exist with originId set to NULL
      const derivedAfter = await db.query.baseItems.findFirst({
        where: eq(schema.baseItems.id, derived[0]!.id),
      });

      expect(derivedAfter).toBeDefined();
      expect(derivedAfter!.originId).toBeNull();
      expect(derivedAfter!.title).toBe("Derived");
    });

    it("should preserve lineage chain when middle item is deleted", async () => {
      // Arrange - create chain: v1 -> v2 -> v3
      const v1 = await db.insert(schema.baseItems).values({
        title: "V1",
        content: "Content V1",
        link: "",
      }).returning();

      const v2 = await db.insert(schema.baseItems).values({
        title: "V2",
        content: "Content V2",
        originId: v1[0]!.id,
        link: "",
      }).returning();

      const v3 = await db.insert(schema.baseItems).values({
        title: "V3",
        content: "Content V3",
        originId: v2[0]!.id,
        link: "",
      }).returning();

      // Act - delete v2 (middle of chain)
      await db.delete(schema.baseItems)
        .where(eq(schema.baseItems.id, v2[0]!.id));

      // Assert - v3 should still exist with originId set to NULL
      const v3After = await db.query.baseItems.findFirst({
        where: eq(schema.baseItems.id, v3[0]!.id),
      });

      expect(v3After).toBeDefined();
      expect(v3After!.originId).toBeNull();

      // v1 should still exist
      const v1After = await db.query.baseItems.findFirst({
        where: eq(schema.baseItems.id, v1[0]!.id),
      });
      expect(v1After).toBeDefined();
    });
  });

  describe("Querying Lineage", () => {
    it("should find all items with a specific origin", async () => {
      // Arrange - create 1 original with 3 derived items
      const original = await db.insert(schema.baseItems).values({
        title: "Original",
        content: "Original content",
        link: "",
      }).returning();

      const derived1 = await db.insert(schema.baseItems).values({
        title: "Derived 1",
        content: "Content 1",
        originId: original[0]!.id,
        link: "",
      }).returning();

      const derived2 = await db.insert(schema.baseItems).values({
        title: "Derived 2",
        content: "Content 2",
        originId: original[0]!.id,
        link: "",
      }).returning();

      const derived3 = await db.insert(schema.baseItems).values({
        title: "Derived 3",
        content: "Content 3",
        originId: original[0]!.id,
        link: "",
      }).returning();

      // Act - query all items derived from original
      const derivedItems = await db.query.baseItems.findMany({
        where: eq(schema.baseItems.originId, original[0]!.id),
      });

      // Assert
      expect(derivedItems).toHaveLength(3);
      expect(derivedItems.map(item => item.title).sort()).toEqual([
        "Derived 1",
        "Derived 2",
        "Derived 3",
      ]);
    });

    it("should find all original items (NULL originId)", async () => {
      // Arrange - create mix of original and derived items
      const original1 = await db.insert(schema.baseItems).values({
        title: "Original 1",
        content: "Content 1",
        link: "",
      }).returning();

      const original2 = await db.insert(schema.baseItems).values({
        title: "Original 2",
        content: "Content 2",
        link: "",
      }).returning();

      await db.insert(schema.baseItems).values({
        title: "Derived from Original 1",
        content: "Derived content",
        originId: original1[0]!.id,
        link: "",
      }).returning();

      // Act - query all original items
      const originals = await db.query.baseItems.findMany({
        where: isNull(schema.baseItems.originId),
      });

      // Assert
      expect(originals).toHaveLength(2);
      expect(originals.map(item => item.title).sort()).toEqual([
        "Original 1",
        "Original 2",
      ]);
    });

    it("should support complex lineage queries", async () => {
      // Arrange - create complex lineage tree
      const root = await db.insert(schema.baseItems).values({
        title: "Root",
        content: "Root content",
        link: "",
      }).returning();

      const branch1 = await db.insert(schema.baseItems).values({
        title: "Branch 1",
        content: "Branch 1 content",
        originId: root[0]!.id,
        link: "",
      }).returning();

      const branch2 = await db.insert(schema.baseItems).values({
        title: "Branch 2",
        content: "Branch 2 content",
        originId: root[0]!.id,
        link: "",
      }).returning();

      const leaf1 = await db.insert(schema.baseItems).values({
        title: "Leaf 1",
        content: "Leaf 1 content",
        originId: branch1[0]!.id,
        link: "",
      }).returning();

      // Act - find all items in branch1's lineage
      const branch1Descendants = await db.query.baseItems.findMany({
        where: eq(schema.baseItems.originId, branch1[0]!.id),
      });

      // Assert
      expect(branch1Descendants).toHaveLength(1);
      expect(branch1Descendants[0]!.title).toBe("Leaf 1");
    });
  });

  describe("Index Performance", () => {
    it("should efficiently query by originId using index", async () => {
      // Arrange - create many items with same origin
      const original = await db.insert(schema.baseItems).values({
        title: "Original",
        content: "Original content",
        link: "",
      }).returning();

      // Create 50 derived items
      const derivedPromises = Array.from({ length: 50 }, (_, i) =>
        db.insert(schema.baseItems).values({
          title: `Derived ${i}`,
          content: `Content ${i}`,
          originId: original[0]!.id,
          link: "",
        })
      );
      await Promise.all(derivedPromises);

      // Act - measure query performance
      const startTime = Date.now();
      const derived = await db.query.baseItems.findMany({
        where: eq(schema.baseItems.originId, original[0]!.id),
      });
      const queryTime = Date.now() - startTime;

      // Assert
      expect(derived).toHaveLength(50);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });
  });

  describe("Type Safety", () => {
    it("should allow originId to be NULL in TypeScript types", () => {
      // This is a compile-time test verified by TypeScript
      const validItem1: typeof schema.baseItems.$inferInsert = {
        title: "Test",
        content: "Content",
        link: "",
        originId: null, // Should be valid
      };

      const validItem2: typeof schema.baseItems.$inferInsert = {
        title: "Test",
        content: "Content",
        link: "",
        originId: 123, // Should be valid
      };

      const validItem3: typeof schema.baseItems.$inferInsert = {
        title: "Test",
        content: "Content",
        link: "",
        // originId omitted - should be valid
      };

      // If this compiles, the test passes
      expect(validItem1).toBeDefined();
      expect(validItem2).toBeDefined();
      expect(validItem3).toBeDefined();
    });
  });
});
