import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { mapItems, baseItems } from "~/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { ItemCrudService } from "~/lib/domains/mapping/services/_item-services/_item-crud.service";
import { MapItemActions } from "~/lib/domains/mapping/_actions/map-item-actions";
import { MapItemType } from "~/lib/domains/mapping/_objects";

describe("Item Movement - Transaction Integration Tests", () => {
  let mapItemRepo: DbMapItemRepository;
  let baseItemRepo: DbBaseItemRepository;
  let service: ItemCrudService;
  let actions: MapItemActions;
  const testUserId = "user-test-1";
  const testGroupId = 66666; // Use a unique group ID to avoid conflicts

  beforeEach(async () => {
    // Clean up any existing test data thoroughly
    await _cleanupTestData();
    // Initialize repositories with main db connection
    mapItemRepo = new DbMapItemRepository(db);
    baseItemRepo = new DbBaseItemRepository(db);

    service = new ItemCrudService({
      mapItem: mapItemRepo,
      baseItem: baseItemRepo,
    });

    actions = new MapItemActions({
      mapItem: mapItemRepo,
      baseItem: baseItemRepo,
    });

  });

  afterEach(async () => {
    // Clean up test data thoroughly
    await _cleanupTestData();
  });

  async function _cleanupTestData() {
    // First get all map items for this test group
    const testMapItems = await db
      .select({ id: mapItems.id, refItemId: mapItems.refItemId })
      .from(mapItems)
      .where(eq(mapItems.coord_group_id, testGroupId));

    // Delete map items first (this should cascade to children due to parentFk cascade)
    await db.delete(mapItems).where(eq(mapItems.coord_group_id, testGroupId));

    // Then delete orphaned base items
    if (testMapItems.length > 0) {
      const refItemIds = testMapItems
        .map((item) => item.refItemId)
        .filter((id): id is number => id !== null);

      if (refItemIds.length > 0) {
        await db.delete(baseItems).where(inArray(baseItems.id, refItemIds));
      }
    }
  }

  it("should atomically move items with transaction support", async () => {
    // Create test items
    const rootItem = await actions.createMapItem({
      itemType: MapItemType.USER,
      coords: { userId: testUserId, groupId: testGroupId, path: [] },
      title: "Test User",
    });

    const item1 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
      title: "Item 1",
      parentId: rootItem.id,
    });

    const item2 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
      title: "Item 2",
      parentId: rootItem.id,
    });

    // Add children to item1
    await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [1, 1] },
      title: "Child 1",
      parentId: item1.id,
    });

    // Move item1 to position 3 (swapping with empty position)
    const result = await service.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [3] },
    });

    // Verify the move was successful
    expect(result.movedItemId).toBe(item1.id);
    expect(result.affectedCount).toBe(2); // item1 and its child

    // Verify items are at new positions
    const movedItem1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [3] },
    });
    expect(movedItem1.id).toBe(item1.id);

    const movedChild = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [3, 1] },
    });
    expect(movedChild.ref.attrs.title).toBe("Child 1");

    // Verify item2 is still at its original position
    const unchangedItem2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });
    expect(unchangedItem2.id).toBe(item2.id);
  });

  it("should atomically swap items when target position is occupied", async () => {
    // Create test items
    const rootItem = await actions.createMapItem({
      itemType: MapItemType.USER,
      coords: { userId: testUserId, groupId: testGroupId, path: [] },
      title: "Test User",
    });

    const item1 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
      title: "Item 1",
      parentId: rootItem.id,
    });

    const item2 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
      title: "Item 2",
      parentId: rootItem.id,
    });

    // Add children to both items
    await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [1, 1] },
      title: "Child of Item 1",
      parentId: item1.id,
    });

    await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
      title: "Child of Item 2",
      parentId: item2.id,
    });

    // Swap item1 and item2
    const result = await service.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });

    // Verify the swap was successful
    expect(result.movedItemId).toBe(item1.id);

    // Verify items have swapped positions
    const swappedItem1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });
    expect(swappedItem1.id).toBe(item1.id);

    const swappedItem2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
    });
    expect(swappedItem2.id).toBe(item2.id);

    // Verify children moved with their parents
    const movedChild1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
    });
    expect(movedChild1.ref.attrs.title).toBe("Child of Item 1");

    const movedChild2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1, 1] },
    });
    expect(movedChild2.ref.attrs.title).toBe("Child of Item 2");
  });

  it("should rollback all changes if any operation fails", async () => {
    // Create test items
    const rootItem = await actions.createMapItem({
      itemType: MapItemType.USER,
      coords: { userId: testUserId, groupId: testGroupId, path: [] },
      title: "Test User",
    });

    const item1 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
      title: "Item 1",
      parentId: rootItem.id,
    });

    // Try to move to an invalid location (e.g., trying to move to a position that would create an invalid hierarchy)
    try {
      await service.moveMapItem({
        oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
        newCoords: { userId: testUserId, groupId: testGroupId + 1, path: [1] }, // Different group - should fail
      });
      
      // Should not reach here
      expect.fail("Move should have failed");
    } catch (error) {
      // Expected to fail
      expect(error).toBeDefined();
    }

    // Verify item1 is still at its original position (transaction rolled back)
    const unchangedItem = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
    });
    expect(unchangedItem.id).toBe(item1.id);
  });
});