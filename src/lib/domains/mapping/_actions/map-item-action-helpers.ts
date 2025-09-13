import type {
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import {
  type MapItemWithId,
  MapItemType,
} from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { MapItemIdr } from "~/lib/domains/mapping/_repositories/map-item";
import type { MapItemMovementHelpers } from "~/lib/domains/mapping/_actions/_map-item-movement-helpers";
import type { MapItemQueryHelpers } from "~/lib/domains/mapping/_actions/_map-item-query-helpers";

export class MapItemActionHelpers {
  public static async getItemAndDescendants(
    idr: MapItemIdr,
    mapItems: MapItemRepository,
    getDescendants: (parentId: number) => Promise<MapItemWithId[]>
  ) {
    let item: MapItemWithId | null = null;

    if ("id" in idr) {
      item = await mapItems.getOne(idr.id);
    } else if (idr.attrs?.coords) {
      item = await mapItems.getOneByIdr({ idr });
    } else {
      throw new Error("Invalid identifier for removeItem");
    }

    if (!item) {
      throw new Error(
        `MapItem not found with provided identifier: ${JSON.stringify(idr)}`,
      );
    }

    const descendants = await getDescendants(item.id);
    return { item, descendants };
  }

  public static async removeDescendantsAndItem(
    descendants: MapItemWithId[],
    itemId: number,
    mapItems: MapItemRepository,
  ) {
    for (const descendant of descendants.reverse()) {
      await mapItems.remove(descendant.id);
    }
    await mapItems.remove(itemId);
  }

  public static validateUserItemMove(item: MapItemWithId, newCoords: Coord) {
    if (item.attrs.itemType === MapItemType.USER && newCoords.path.length > 0) {
      throw new Error(
        "USER (root) items cannot be moved to become child items.",
      );
    }
  }

  public static validateUserSpaceMove(item: MapItemWithId, newCoords: Coord) {
    if (
      item.attrs.itemType === MapItemType.USER &&
      (item.attrs.coords.userId !== newCoords.userId ||
        item.attrs.coords.groupId !== newCoords.groupId)
    ) {
      throw new Error(
        "USER (root) items cannot change their userId or groupId through a move operation.",
      );
    }

    if (
      item.attrs.coords.userId !== newCoords.userId ||
      item.attrs.coords.groupId !== newCoords.groupId
    ) {
      throw new Error("Cannot move item to a different userId/groupId space.");
    }
  }

  public static async handleTargetItemDisplacement(
    targetItem: MapItemWithId | null,
    sourceParent: MapItemWithId | null,
    oldCoords: Coord,
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers,
  ) {
    if (!targetItem) return null;

    if (
      targetItem.attrs.itemType === MapItemType.USER &&
      oldCoords.path.length > 0
    ) {
      throw new Error("Cannot displace a USER (root) item with a child item.");
    }

    // Step 1: Move target item to temporary position
    try {
      const tempCoords = await movementHelpers.moveItemToTemporaryLocation(
        targetItem,
        sourceParent,
        (item, coords, parent) =>
          movementHelpers.move(item, coords, parent, (parentId) =>
            queryHelpers.getDescendants(parentId),
          ),
      );
      return tempCoords;
    } catch (error) {
      console.error(`[MOVE STEP 1] Failed to move target item ${targetItem.id} to temporary position:`, error);
      throw error;
    }
  }
}