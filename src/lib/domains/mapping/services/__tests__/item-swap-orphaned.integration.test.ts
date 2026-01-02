import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "~/server/db";
import { mapItems } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { ItemQueryService } from "~/lib/domains/mapping/services/_item-services/_item-query.service";
import { MapItemActions } from "~/lib/domains/mapping/_actions/map-item-actions";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import { type Direction } from "~/lib/domains/mapping/utils";

describe("Item Swap with Orphaned Temp Item - Integration Test", () => {
  let mapItemRepo: DbMapItemRepository;
  let baseItemRepo: DbBaseItemRepository;
  let queryService: ItemQueryService;
  let actions: MapItemActions;
  const testUserId = "user-test-1";
  const testGroupId = 99999; // Use a unique group ID

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

  it("should handle swap when there's an orphaned item at temp position", async () => {
    // Create test items
    const rootItem = await actions.createMapItem({
      itemType: MapItemType.USER,
      coords: { userId: testUserId, groupId: testGroupId, path: [] },
      title: "Test User",
    });

    const item1 = await actions.createMapItem({
      itemType: MapItemType.CONTEXT,
      coords: { userId: testUserId, groupId: testGroupId, path: [1] },
      title: "Item 1",
      parentId: rootItem.id,
    });

    const item2 = await actions.createMapItem({
      itemType: MapItemType.CONTEXT,
      coords: { userId: testUserId, groupId: testGroupId, path: [2] },
      title: "Item 2",
      parentId: rootItem.id,
    });

    // Manually create an orphaned item at the temporary position (direction 7)
    // This simulates a previous failed swap that left an item at temp position
    const orphanedItem = await actions.createMapItem({
      itemType: MapItemType.CONTEXT,
      coords: { userId: testUserId, groupId: testGroupId, path: [7 as Direction] },
      title: "Orphaned Item at Temp Position",
      parentId: rootItem.id,
    });

    console.log(`[TEST] Created orphaned item ${orphanedItem.id} at temporary position 7`);

    // Perform the swap - it should detect the orphaned item and use alternative position
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

    // Verify the orphaned item is still at position 7 (wasn't deleted)
    const orphanedStillExists = await actions.getMapItem({
      coords: { userId: testUserId, groupId: testGroupId, path: [7 as Direction] },
    });
    expect(orphanedStillExists.id).toBe(orphanedItem.id);

    // Verify no new items were left at alternative temp position 8
    await expect(
      actions.getMapItem({
        coords: { userId: testUserId, groupId: testGroupId, path: [8 as Direction] },
      })
    ).rejects.toThrow();
  });
});