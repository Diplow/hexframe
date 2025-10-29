import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { mapItems } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { ItemCrudService } from "~/lib/domains/mapping/services/_item-services/_item-crud.service";
import { MapItemActions } from "~/lib/domains/mapping/_actions/map-item-actions";
import { MapItemType } from "~/lib/domains/mapping/_objects";

describe("Item Swap Fix - Regression Test", () => {
  let mapItemRepo: DbMapItemRepository;
  let baseItemRepo: DbBaseItemRepository;
  let service: ItemCrudService;
  let actions: MapItemActions;
  const testUserId = 1;
  const testGroupId = 77777; // Use a unique group ID

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(mapItems).where(eq(mapItems.coord_group_id, testGroupId));

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
    // Clean up test data
    await db.delete(mapItems).where(eq(mapItems.coord_group_id, testGroupId));
  });

  it("should handle swap without duplicate key violation", async () => {
    // This test specifically addresses the bug where swapping items
    // caused a duplicate key violation due to stale coordinate data
    
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

    // Add children to both items to make the swap more complex
    const child1 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [1, 1] },
      title: "Child of Item 1",
      parentId: item1.id,
    });

    const child2 = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
      title: "Child of Item 2",
      parentId: item2.id,
    });

    // Perform the swap
    const result = await service.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });

    // Verify the swap was successful
    expect(result.movedItemId).toBe(item1.id);
    expect(result.affectedCount).toBe(4); // item1, item2, and their children

    // Verify items have swapped positions
    const swappedItem1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });
    expect(swappedItem1.id).toBe(item1.id);
    expect(swappedItem1.ref.attrs.title).toBe("Item 1");

    const swappedItem2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
    });
    expect(swappedItem2.id).toBe(item2.id);
    expect(swappedItem2.ref.attrs.title).toBe("Item 2");

    // Verify children moved with their parents
    const movedChild1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
    });
    expect(movedChild1.id).toBe(child1.id);
    expect(movedChild1.ref.attrs.title).toBe("Child of Item 1");

    const movedChild2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1, 1] },
    });
    expect(movedChild2.id).toBe(child2.id);
    expect(movedChild2.ref.attrs.title).toBe("Child of Item 2");

    // Verify no items are left at temporary position
    const itemsAtTempPosition = await db
      .select()
      .from(mapItems)
      .where(
        eq(mapItems.path, "7")
      );
    expect(itemsAtTempPosition).toHaveLength(0);
  });

  it("should handle multiple consecutive swaps", async () => {
    // Create test items
    const rootItem = await actions.createMapItem({
      itemType: MapItemType.USER,
      coords: { userId: testUserId, groupId: testGroupId, path: [] },
      title: "Test User",
    });

    const items = await Promise.all([
      actions.createMapItem({
        itemType: MapItemType.BASE,
        coords: { userId: testUserId, groupId: testGroupId, path: [1] },
        title: "Item 1",
        parentId: rootItem.id,
      }),
      actions.createMapItem({
        itemType: MapItemType.BASE,
        coords: { userId: testUserId, groupId: testGroupId, path: [2] },
        title: "Item 2",
        parentId: rootItem.id,
      }),
      actions.createMapItem({
        itemType: MapItemType.BASE,
        coords: { userId: testUserId, groupId: testGroupId, path: [3] },
        title: "Item 3",
        parentId: rootItem.id,
      }),
    ]);

    // Perform multiple swaps
    // Swap 1 and 2
    await service.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });

    // Swap 2 (now at position 1) and 3
    await service.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [3] },
    });

    // Verify final positions
    const finalItem1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });
    expect(finalItem1.id).toBe(items[0].id); // Item 1 is at position 2

    const finalItem2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [3] },
    });
    expect(finalItem2.id).toBe(items[1].id); // Item 2 is at position 3

    const finalItem3 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
    });
    expect(finalItem3.id).toBe(items[2].id); // Item 3 is at position 1
  });
});