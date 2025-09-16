import type { MapItemWithId } from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/_objects";

export class ValidationStrategy {
  validateUserItemMove(item: MapItemWithId, newCoords: Coord): void {
    if (item.attrs.itemType === MapItemType.USER && newCoords.path.length > 0) {
      throw new Error(
        "USER (root) items cannot be moved to become child items."
      );
    }
  }

  validateUserSpaceMove(item: MapItemWithId, newCoords: Coord): void {
    if (
      item.attrs.itemType === MapItemType.USER &&
      (item.attrs.coords.userId !== newCoords.userId ||
        item.attrs.coords.groupId !== newCoords.groupId)
    ) {
      throw new Error(
        "USER (root) items cannot change their userId or groupId through a move operation."
      );
    }

    if (
      item.attrs.coords.userId !== newCoords.userId ||
      item.attrs.coords.groupId !== newCoords.groupId
    ) {
      throw new Error("Cannot move item to a different userId/groupId space.");
    }
  }

  validateTargetDisplacement(targetItem: MapItemWithId, oldCoords: Coord): void {
    if (
      targetItem.attrs.itemType === MapItemType.USER &&
      oldCoords.path.length > 0
    ) {
      throw new Error("Cannot displace a USER (root) item with a child item.");
    }
  }
}