import type { MapItem } from "~/lib/domains/mapping/_objects/map-item";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";
import { MapItemType } from "~/lib/domains/mapping/_objects/map-item";
import { MapItemNeighborValidation } from "~/lib/domains/mapping/_objects/map-item-neighbor-validation";

export class MapItemValidation {
  public static validateCoords(_item: MapItem) {
    // The old row/col checks are removed as Coord changed.
    // Path length validation might still be relevant depending on requirements.
    // e.g. if (item.attrs.coords.path.length > MAX_DEPTH) ...
    // For now, no specific universal validation on coords beyond its structure.
  }

  public static validateParentChildRelationship(item: MapItem) {
    if (item.attrs.itemType === MapItemType.USER) {
      if (item.attrs.parentId !== null || item.parent !== null) {
        throw new Error(MAPPING_ERRORS.USER_ITEM_CANNOT_HAVE_PARENT);
      }
    } else {
      // For BASE type items (children)
      if (item.attrs.parentId === null && item.parent === null) {
        throw new Error(MAPPING_ERRORS.BASE_ITEM_MUST_HAVE_PARENT);
      }
      if (item.parent) {
        // If parent object is available, check its coords
        if (
          item.attrs.coords.userId !== item.parent.attrs.coords.userId ||
          item.attrs.coords.groupId !== item.parent.attrs.coords.groupId
        ) {
          throw new Error(MAPPING_ERRORS.CHILD_COORDS_MUST_MATCH_PARENT);
        }
        const parentDepth = item.parent.attrs.coords.path.length;
        const itemDepth = item.attrs.coords.path.length;
        if (itemDepth !== parentDepth + 1) {
          throw new Error(MAPPING_ERRORS.INVALID_PARENT_LEVEL);
        }
      }
    }

    if (
      item.attrs.parentId === null &&
      item.attrs.itemType !== MapItemType.USER
    ) {
      throw new Error(MAPPING_ERRORS.NULL_PARENT_MUST_BE_USER_TYPE);
    }
  }

  public static validateNeighbors(item: MapItem) {
    MapItemNeighborValidation.validateNeighbors(item);
  }
}