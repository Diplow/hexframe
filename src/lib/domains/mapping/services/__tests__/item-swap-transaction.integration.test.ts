import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { mapItems } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { ItemQueryService } from "~/lib/domains/mapping/services/_item-query.service";
import { MapItemActions } from "~/lib/domains/mapping/_actions/map-item-actions";
import { MapItemType } from "~/lib/domains/mapping/_objects";

describe("Item Swap Transaction - Integration Test", () => {
  let mapItemRepo: DbMapItemRepository;
  let baseItemRepo: DbBaseItemRepository;
  let queryService: ItemQueryService;
  let actions: MapItemActions;
  const testUserId = 1;
  const testGroupId = 88888; // Use a unique group ID

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(mapItems).where(eq(mapItems.coord_group_id, testGroupId));

    // Initialize repositories with main db connection
    mapItemRepo = new DbMapItemRepository(db);
    baseItemRepo = new DbBaseItemRepository(db);
    
    // Initialize services
    queryService = new ItemQueryService({
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

  it("should handle swap through query service with transaction", async () => {
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

    // Perform the swap through the query service (which now uses transactions)
    const result = await queryService.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });

    // Verify the swap was successful
    expect(result.movedItemId).toBe(item1.id);
    expect(result.affectedCount).toBe(2); // Both items should be affected

    // Verify items have swapped positions
    const swappedItem1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
    });
    expect(swappedItem1.id).toBe(item1.id);

    const swappedItem2 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
    });
    expect(swappedItem2.id).toBe(item2.id);

    // Verify no items are left at temporary position
    const itemsAtTempPosition = await db
      .select()
      .from(mapItems)
      .where(
        eq(mapItems.path, "7")
      );
    expect(itemsAtTempPosition).toHaveLength(0);
  });

  it("should handle the problematic sibling's child swap pattern", async () => {
    // Create test items in the problematic pattern
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
      title: "Item 2 (Sibling)",
      parentId: rootItem.id,
    });

    const item2Child = await actions.createMapItem({
      itemType: MapItemType.BASE,
      coords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
      title: "Child of Item 2",
      parentId: item2.id,
    });

    // Try to swap item1 with item2's child - this should work with transactions
    // but might be blocked by frontend validation
    const result = await queryService.moveMapItem({
      oldCoords: { userId: testUserId, groupId: testGroupId, path: [1] },
      newCoords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
    });

    // If it succeeds (with transaction), verify the swap
    expect(result.movedItemId).toBe(item1.id);
    
    // Verify positions
    const swappedItem1 = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [2, 1] },
    });
    expect(swappedItem1.id).toBe(item1.id);

    const swappedItem2Child = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
    });
    expect(swappedItem2Child.id).toBe(item2Child.id);
  });
});