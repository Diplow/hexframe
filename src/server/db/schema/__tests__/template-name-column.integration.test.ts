import { describe, beforeEach, it, expect } from "vitest";
import { db } from "~/server/db";
import { schema } from "~/server/db";
import { _createUniqueTestParams } from "~/lib/domains/mapping/services/__tests__/helpers/_test-utilities";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { MapItemType } from "~/lib/domains/mapping";

/**
 * TDD Tests for templateName column feature.
 *
 * The templateName column enables "templates as tiles" - storing prompt templates
 * as map items rather than TypeScript code. This allows user-created templates
 * and transparent prompt inspection.
 *
 * Requirements from docs/features/TEMPLATES_AS_TILES.md:
 * - templateName is a nullable VARCHAR(100) column on map_items
 * - templateName has a unique constraint (globally unique)
 * - Templates can be looked up by templateName for prompt rendering
 *
 * These tests are written BEFORE the implementation (TDD Red phase).
 * They will fail until the templateName column is added to the schema.
 */
describe("Schema: templateName column [Integration - DB]", () => {
  let baseItemRepository: DbBaseItemRepository;
  let testBaseItemId: number;
  let testUserId: number;
  let testParams: { userId: string; groupId: number };

  beforeEach(async () => {
    // Use unique params to avoid conflicts with other tests running in parallel
    testParams = _createUniqueTestParams("template-name-test");
    baseItemRepository = new DbBaseItemRepository(db);

    // Create a test base item to reference
    const baseItem = await baseItemRepository.create({
      attrs: {
        title: "Test Template Item",
        content: "Template content with Mustache markup",
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
        coord_user_id: testParams.userId,
        coord_group_id: testParams.groupId,
        path: "",
        item_type: MapItemType.USER,
        refItemId: testBaseItemId,
        parentId: null,
      })
      .returning();
    testUserId = userItem[0]?.id ?? 0;
  });

  describe("schema includes templateName field", () => {
    it("should accept templateName field when inserting a map item", async () => {
      // Arrange: Create a template tile with templateName
      const templateName = "system-template";

      // Act: Insert map item with templateName
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: templateName,
        })
        .returning();

      // Assert: Verify templateName was stored
      expect(insertedItem).toBeDefined();
      expect(insertedItem!.templateName).toBe(templateName);
    });

    it("should return templateName when querying map items", async () => {
      // Arrange: Insert a template tile
      const templateName = "context-template";
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "2",
          item_type: MapItemType.CONTEXT,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: templateName,
        })
        .returning();

      // Act: Query the item from database
      const retrievedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });

      // Assert: Verify templateName is returned
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.templateName).toBe(templateName);
    });

    it("should include templateName in the MapItem type inference", async () => {
      // This test verifies the TypeScript type includes templateName
      // If templateName is missing from schema, this won't compile
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "3",
          item_type: MapItemType.ORGANIZATIONAL,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: "organizational-template",
        })
        .returning();

      // Type assertion: templateName should be string | null
      const templateNameValue: string | null = insertedItem!.templateName;
      expect(templateNameValue).toBe("organizational-template");
    });
  });

  describe("unique constraint enforcement", () => {
    it("should reject duplicate templateName values", async () => {
      // Arrange: Create first template with a unique name
      const duplicateTemplateName = "my-unique-template";

      await db.insert(schema.mapItems).values({
        coord_user_id: testParams.userId,
        coord_group_id: testParams.groupId,
        path: "1",
        item_type: MapItemType.SYSTEM,
        refItemId: testBaseItemId,
        parentId: testUserId,
        templateName: duplicateTemplateName,
      });

      // Act & Assert: Attempting to insert duplicate templateName should fail
      await expect(
        db.insert(schema.mapItems).values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "2",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: duplicateTemplateName,
        }),
      ).rejects.toThrow();
    });

    it("should reject duplicate templateName across different users", async () => {
      // Arrange: Create template for first user
      const sharedTemplateName = "shared-template-name";
      const otherUserParams = _createUniqueTestParams("other-user");

      await db.insert(schema.mapItems).values({
        coord_user_id: testParams.userId,
        coord_group_id: testParams.groupId,
        path: "1",
        item_type: MapItemType.SYSTEM,
        refItemId: testBaseItemId,
        parentId: testUserId,
        templateName: sharedTemplateName,
      });

      // Create root for other user
      const [otherUserRoot] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: otherUserParams.userId,
          coord_group_id: otherUserParams.groupId,
          path: "",
          item_type: MapItemType.USER,
          refItemId: testBaseItemId,
          parentId: null,
        })
        .returning();

      // Act & Assert: Same templateName for different user should also fail
      await expect(
        db.insert(schema.mapItems).values({
          coord_user_id: otherUserParams.userId,
          coord_group_id: otherUserParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: otherUserRoot!.id,
          templateName: sharedTemplateName,
        }),
      ).rejects.toThrow();
    });

    it("should allow different templateName values for different items", async () => {
      // Arrange & Act: Insert multiple items with unique templateNames
      const items = await db
        .insert(schema.mapItems)
        .values([
          {
            coord_user_id: testParams.userId,
            coord_group_id: testParams.groupId,
            path: "1",
            item_type: MapItemType.SYSTEM,
            refItemId: testBaseItemId,
            parentId: testUserId,
            templateName: "template-alpha",
          },
          {
            coord_user_id: testParams.userId,
            coord_group_id: testParams.groupId,
            path: "2",
            item_type: MapItemType.SYSTEM,
            refItemId: testBaseItemId,
            parentId: testUserId,
            templateName: "template-beta",
          },
          {
            coord_user_id: testParams.userId,
            coord_group_id: testParams.groupId,
            path: "3",
            item_type: MapItemType.SYSTEM,
            refItemId: testBaseItemId,
            parentId: testUserId,
            templateName: "template-gamma",
          },
        ])
        .returning();

      // Assert: All insertions should succeed
      expect(items).toHaveLength(3);
      expect(items[0]!.templateName).toBe("template-alpha");
      expect(items[1]!.templateName).toBe("template-beta");
      expect(items[2]!.templateName).toBe("template-gamma");
    });
  });

  describe("CRUD operations handle templateName correctly", () => {
    it("should create item with templateName", async () => {
      // Arrange
      const templateName = "create-test-template";

      // Act
      const [createdItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: templateName,
        })
        .returning();

      // Assert
      expect(createdItem!.templateName).toBe(templateName);
    });

    it("should read item with templateName", async () => {
      // Arrange
      const templateName = "read-test-template";
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: templateName,
        })
        .returning();

      // Act
      const readItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) => eq(mapItems.id, insertedItem!.id),
      });

      // Assert
      expect(readItem!.templateName).toBe(templateName);
    });

    it("should update templateName", async () => {
      // Arrange
      const originalTemplateName = "original-template";
      const updatedTemplateName = "updated-template";

      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: originalTemplateName,
        })
        .returning();

      // Act
      const { eq } = await import("drizzle-orm");
      const [updatedItem] = await db
        .update(schema.mapItems)
        .set({ templateName: updatedTemplateName })
        .where(eq(schema.mapItems.id, insertedItem!.id))
        .returning();

      // Assert
      expect(updatedItem!.templateName).toBe(updatedTemplateName);
    });

    it("should delete item with templateName (cascade properly)", async () => {
      // Arrange
      const templateName = "delete-test-template";
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: templateName,
        })
        .returning();

      // Act
      const { eq } = await import("drizzle-orm");
      await db
        .delete(schema.mapItems)
        .where(eq(schema.mapItems.id, insertedItem!.id));

      // Assert: Item should be deleted
      const deletedItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq: whereEq }) =>
          whereEq(mapItems.id, insertedItem!.id),
      });
      expect(deletedItem).toBeUndefined();

      // Assert: templateName should now be available for reuse
      const [reusedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: templateName,
        })
        .returning();

      expect(reusedItem!.templateName).toBe(templateName);
    });

    it("should find items by templateName", async () => {
      // Arrange
      const targetTemplateName = "findable-template";
      await db.insert(schema.mapItems).values([
        {
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: targetTemplateName,
        },
        {
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "2",
          item_type: MapItemType.CONTEXT,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: "other-template",
        },
      ]);

      // Act
      const foundItem = await db.query.mapItems.findFirst({
        where: (mapItems, { eq }) =>
          eq(mapItems.templateName, targetTemplateName),
      });

      // Assert
      expect(foundItem).toBeDefined();
      expect(foundItem!.templateName).toBe(targetTemplateName);
      expect(foundItem!.path).toBe("1");
    });
  });

  describe("NULL values are properly handled", () => {
    it("should allow NULL templateName (default behavior)", async () => {
      // Act: Insert without templateName (should default to null)
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.CONTEXT,
          refItemId: testBaseItemId,
          parentId: testUserId,
          // templateName intentionally omitted
        })
        .returning();

      // Assert
      expect(insertedItem!.templateName).toBeNull();
    });

    it("should allow explicit NULL templateName", async () => {
      // Act: Insert with explicit null templateName
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.CONTEXT,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: null,
        })
        .returning();

      // Assert
      expect(insertedItem!.templateName).toBeNull();
    });

    it("should allow multiple items with NULL templateName (no unique violation)", async () => {
      // Act: Insert multiple items without templateName
      const items = await db
        .insert(schema.mapItems)
        .values([
          {
            coord_user_id: testParams.userId,
            coord_group_id: testParams.groupId,
            path: "1",
            item_type: MapItemType.CONTEXT,
            refItemId: testBaseItemId,
            parentId: testUserId,
            templateName: null,
          },
          {
            coord_user_id: testParams.userId,
            coord_group_id: testParams.groupId,
            path: "2",
            item_type: MapItemType.CONTEXT,
            refItemId: testBaseItemId,
            parentId: testUserId,
            templateName: null,
          },
          {
            coord_user_id: testParams.userId,
            coord_group_id: testParams.groupId,
            path: "3",
            item_type: MapItemType.CONTEXT,
            refItemId: testBaseItemId,
            parentId: testUserId,
            // templateName omitted
          },
        ])
        .returning();

      // Assert: All should succeed (NULL doesn't violate unique constraint)
      expect(items).toHaveLength(3);
      items.forEach((item) => {
        expect(item.templateName).toBeNull();
      });
    });

    it("should update templateName from value to NULL", async () => {
      // Arrange
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: "to-be-nulled",
        })
        .returning();

      // Act
      const { eq } = await import("drizzle-orm");
      const [updatedItem] = await db
        .update(schema.mapItems)
        .set({ templateName: null })
        .where(eq(schema.mapItems.id, insertedItem!.id))
        .returning();

      // Assert
      expect(updatedItem!.templateName).toBeNull();
    });

    it("should update templateName from NULL to value", async () => {
      // Arrange
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: null,
        })
        .returning();

      // Act
      const { eq } = await import("drizzle-orm");
      const [updatedItem] = await db
        .update(schema.mapItems)
        .set({ templateName: "now-has-value" })
        .where(eq(schema.mapItems.id, insertedItem!.id))
        .returning();

      // Assert
      expect(updatedItem!.templateName).toBe("now-has-value");
    });

    it("should query items with NULL templateName", async () => {
      // Arrange: Insert items with and without templateName
      await db.insert(schema.mapItems).values([
        {
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: "has-name",
        },
        {
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "2",
          item_type: MapItemType.CONTEXT,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: null,
        },
        {
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "3",
          item_type: MapItemType.CONTEXT,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: null,
        },
      ]);

      // Act: Query for items with NULL templateName
      const { and, eq, isNull } = await import("drizzle-orm");
      const nullTemplateItems = await db.query.mapItems.findMany({
        where: and(
          eq(schema.mapItems.coord_user_id, testParams.userId),
          eq(schema.mapItems.coord_group_id, testParams.groupId),
          isNull(schema.mapItems.templateName),
        ),
      });

      // Assert: Should find items with NULL templateName (including root)
      // Root item has null templateName, plus the 2 items we inserted with null
      const nullTemplateItemsExcludingRoot = nullTemplateItems.filter(
        (item) => item.path !== "",
      );
      expect(nullTemplateItemsExcludingRoot).toHaveLength(2);
    });
  });

  describe("templateName length constraint", () => {
    it("should accept templateName up to 100 characters", async () => {
      // Arrange: Create a 100-character templateName
      const maxLengthTemplateName = "a".repeat(100);

      // Act
      const [insertedItem] = await db
        .insert(schema.mapItems)
        .values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: maxLengthTemplateName,
        })
        .returning();

      // Assert
      expect(insertedItem!.templateName).toBe(maxLengthTemplateName);
      expect(insertedItem!.templateName!.length).toBe(100);
    });

    it("should reject templateName exceeding 100 characters", async () => {
      // Arrange: Create a 101-character templateName
      const tooLongTemplateName = "a".repeat(101);

      // Act & Assert: Should fail with length constraint violation
      await expect(
        db.insert(schema.mapItems).values({
          coord_user_id: testParams.userId,
          coord_group_id: testParams.groupId,
          path: "1",
          item_type: MapItemType.SYSTEM,
          refItemId: testBaseItemId,
          parentId: testUserId,
          templateName: tooLongTemplateName,
        }),
      ).rejects.toThrow();
    });
  });
});
