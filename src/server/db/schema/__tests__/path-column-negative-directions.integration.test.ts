import { describe, beforeEach, it, expect } from "vitest";
import { db } from "~/server/db";
import { schema } from "~/server/db";
import { _cleanupDatabase } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { MapItemType } from "~/lib/domains/mapping";

/**
 * Integration tests verifying that the map_items.path varchar(255) column
 * correctly stores and retrieves negative direction values.
 *
 * Negative directions (-1 to -6) represent composed children in the hexagonal
 * coordinate system, while positive directions (1-6) represent structural children.
 *
 * Path format: comma-separated integers, e.g., "1,-3,2,-5"
 * This test suite verifies the schema can handle:
 * - Negative integers in the path
 * - Mixed positive and negative integers
 * - Deep paths with multiple negative directions
 */
describe("Schema: path column negative direction support [Integration - DB]", () => {
  let baseItemRepository: DbBaseItemRepository;
  let testBaseItemId: number;
  let testUserId: number;

  beforeEach(async () => {
    await _cleanupDatabase();
    baseItemRepository = new DbBaseItemRepository(db);

    // Create a test base item to reference
    const baseItem = await baseItemRepository.create({
      attrs: {
        title: "Test Item",
        content: "Test content",
        link: "",
      },
      relatedItems: {},
      relatedLists: {},
    });
    testBaseItemId = baseItem.id;

    // Create a test user item (root)
    const userItem = await db
      .insert(schema.mapItems)
      .values({
        coord_user_id: "user-test-1",
        coord_group_id: 0,
        path: "",
        item_type: MapItemType.USER,
        refItemId: testBaseItemId,
        parentId: null,
      })
      .returning();
    testUserId = userItem[0]?.id ?? 0;
  });

  describe("single negative direction in path", () => {
    it("should store and retrieve path with single negative direction", async () => {
      // Arrange: Create a map item with a composed child path (negative direction)
      const pathWithNegative = "1,-3"; // NorthWest (1), then ComposedEast (-3)

      // Act: Insert map item with negative direction
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: pathWithNegative,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        })
        .returning();

      // Assert: Verify the path was stored correctly
      expect(insertedItem).toBeDefined();
      expect(insertedItem!.path).toBe(pathWithNegative);

      // Act: Retrieve the item from database
      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });

      // Assert: Verify retrieved path matches
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.path).toBe(pathWithNegative);
    });

    it("should handle all negative direction values (-1 to -6)", async () => {
      // Arrange: Test all negative direction values
      const negativeDirections = [-1, -2, -3, -4, -5, -6];
      const insertedItems = [];

      // Act: Insert items with each negative direction
      for (const negDir of negativeDirections) {
        const path = `1,${negDir}`; // Structural child then composed child
        const [item] = await db
          .insert(schema.mapItems)
          .values({
            coord_user_id: "user-test-1",
            coord_group_id: 0,
            path: path,
            item_type: MapItemType.BASE,
            refItemId: testBaseItemId,
            parentId: testUserId,
          })
          .returning();
        insertedItems.push(item);
      }

      // Assert: Verify all paths were stored correctly
      expect(insertedItems).toHaveLength(6);
      for (let i = 0; i < negativeDirections.length; i++) {
        const expectedPath = `1,${negativeDirections[i]}`;
        expect(insertedItems[i]!.path).toBe(expectedPath);
      }

      // Act: Retrieve all items
      const insertedIds = insertedItems
        .map((item) => item?.id)
        .filter((id): id is number => id !== undefined);
      const retrievedItems = await db.query.mapItems.findMany({
        where: (mapItems, { inArray }) => inArray(mapItems.id, insertedIds),
      });

      // Assert: Verify all retrieved paths match
      expect(retrievedItems).toHaveLength(6);
      for (const item of retrievedItems) {
        const expectedNegDir = negativeDirections.find((dir) =>
          item.path.endsWith(`,${dir}`),
        );
        expect(expectedNegDir).toBeDefined();
      }
    });
  });

  describe("multiple negative directions in path", () => {
    it("should store path with multiple negative directions", async () => {
      // Arrange: Deep path with multiple negative directions
      const complexPath = "1,-3,-5,2,-1"; // Mix of positive and negative

      // Act: Insert map item
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: complexPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        })
        .returning();

      // Assert: Verify storage
      expect(insertedItem!.path).toBe(complexPath);

      // Act: Retrieve from database
      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });

      // Assert: Verify retrieval
      expect(retrievedItem!.path).toBe(complexPath);
    });

    it("should store consecutive negative directions", async () => {
      // Arrange: Path with only negative directions
      const negativeOnlyPath = "-1,-2,-3";

      // Act: Insert map item
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: negativeOnlyPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        })
        .returning();

      // Assert
      expect(insertedItem!.path).toBe(negativeOnlyPath);

      // Verify retrieval
      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });
      expect(retrievedItem!.path).toBe(negativeOnlyPath);
    });
  });

  describe("mixed positive, zero, and negative directions", () => {
    it("should handle mix of positive and negative directions", async () => {
      // Arrange: Path with structural (positive) and composed (negative) children
      const mixedPath = "1,2,-3,4,-5,6"; // Alternating pattern

      // Act
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: mixedPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        })
        .returning();

      // Assert
      expect(insertedItem!.path).toBe(mixedPath);

      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });
      expect(retrievedItem!.path).toBe(mixedPath);
    });

    it("should handle zero direction (composition) with negative directions", async () => {
      // Arrange: Path with composition (0) followed by composed child (negative)
      const pathWithZero = "1,0,-3"; // Structural → Composition → Composed child

      // Act
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: pathWithZero,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        })
        .returning();

      // Assert
      expect(insertedItem!.path).toBe(pathWithZero);

      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });
      expect(retrievedItem!.path).toBe(pathWithZero);
    });
  });

  describe("edge cases and path length", () => {
    it("should handle deep paths with negative directions", async () => {
      // Arrange: Very deep path (approaching varchar(255) limit)
      // Each direction takes 1-2 chars plus comma, so ~50 directions is safe
      const deepPathParts = [];
      for (let i = 0; i < 40; i++) {
        deepPathParts.push(i % 2 === 0 ? "1" : "-3");
      }
      const deepPath = deepPathParts.join(",");

      // Verify path length is under 255
      expect(deepPath.length).toBeLessThan(255);

      // Act
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: deepPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        })
        .returning();

      // Assert
      expect(insertedItem!.path).toBe(deepPath);

      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });
      expect(retrievedItem!.path).toBe(deepPath);
    });

    it("should handle root path (empty string) as baseline", async () => {
      // Arrange: Empty path for root items
      const emptyPath = "";

      // Act
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: "user-test-2", // Different user to avoid USER type conflict
          coord_group_id: 0,
          path: emptyPath,
          item_type: MapItemType.USER,
          refItemId: testBaseItemId,
          parentId: null,
        })
        .returning();

      // Assert
      expect(insertedItem!.path).toBe(emptyPath);
    });
  });

  describe("querying with negative directions", () => {
    it("should filter items by path with negative directions", async () => {
      // Arrange: Insert multiple items with different paths
      const paths = ["1,-3", "1,-3,2", "1,-3,-5", "2,-3"];

      for (const path of paths) {
        await db.insert(schema.mapItems).values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: path,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        });
      }

      // Act: Query for specific path with negative direction
      const items = await db.query.mapItems.findMany({
        where: (mapItems, { eq }) => eq(mapItems.path, "1,-3"),
      });

      // Assert: Should find exactly one item
      expect(items).toHaveLength(1);
      expect(items[0]!.path).toBe("1,-3");
    });

    it("should use LIKE queries to find composed children descendants", async () => {
      // Arrange: Insert parent and descendant with negative directions
      const parentPath = "1,-3";
      const childPath = "1,-3,2";
      const grandchildPath = "1,-3,2,-5";
      const unrelatedPath = "2,-3";

      await db.insert(schema.mapItems).values([
        {
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: parentPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        },
        {
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: childPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        },
        {
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: grandchildPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        },
        {
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: unrelatedPath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        },
      ]);

      // Act: Find all descendants of parent (paths starting with "1,-3,")
      const { like, and, eq } = await import("drizzle-orm");
      const descendants = await db.query.mapItems.findMany({
        where: and(
          eq(schema.mapItems.coord_user_id, "user-test-1"),
          eq(schema.mapItems.coord_group_id, 0),
          like(schema.mapItems.path, `${parentPath},%`),
        ),
      });

      // Assert: Should find child and grandchild but not parent or unrelated
      expect(descendants).toHaveLength(2);
      const descendantPaths = descendants.map((item) => item.path).sort();
      expect(descendantPaths).toEqual(["1,-3,2", "1,-3,2,-5"]);
    });
  });

  describe("schema constraints with negative directions", () => {
    it("should enforce unique coordinates including negative directions", async () => {
      // Arrange: Create item with negative direction path
      const duplicatePath = "1,-3,2";

      await db.insert(schema.mapItems).values({
        coord_user_id: "user-test-1",
        coord_group_id: 0,
        path: duplicatePath,
        item_type: MapItemType.BASE,
        refItemId: testBaseItemId,
        parentId: testUserId,
      });

      // Act & Assert: Attempting to insert duplicate should fail
      await expect(
        db.insert(schema.mapItems).values({
          coord_user_id: "user-test-1",
          coord_group_id: 0,
          path: duplicatePath,
          item_type: MapItemType.BASE,
          refItemId: testBaseItemId,
          parentId: testUserId,
        }),
      ).rejects.toThrow();
    });

    it("should allow same negative direction in different coordinate spaces", async () => {
      // Arrange: Same path but different user/group
      const samePath = "1,-3";

      // Act: Insert into different coordinate spaces
      const items = await db
        .insert(schema.mapItems)
        .values([
          {
            coord_user_id: "user-test-1",
            coord_group_id: 0,
            path: samePath,
            item_type: MapItemType.BASE,
            refItemId: testBaseItemId,
            parentId: testUserId,
          },
          {
            coord_user_id: "user-test-1",
            coord_group_id: 1, // Different group
            path: samePath,
            item_type: MapItemType.BASE,
            refItemId: testBaseItemId,
            parentId: testUserId,
          },
          {
            coord_user_id: "user-test-2", // Different user
            coord_group_id: 0,
            path: samePath,
            item_type: MapItemType.BASE,
            refItemId: testBaseItemId,
            parentId: testUserId,
          },
        ])
        .returning();

      // Assert: All three should succeed
      expect(items).toHaveLength(3);
      items.forEach((item) => {
        expect(item.path).toBe(samePath);
      });
    });
  });
});
