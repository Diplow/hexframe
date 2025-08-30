import {
  GenericAggregate,
  type GenericAggregateConstructorArgs,
} from "~/lib/domains/utils/generic-objects";
import {
  type Coord,
  type Direction,
} from "~/lib/domains/mapping/utils/hex-coordinates";
import type { BaseItemWithId } from "~/lib/domains/mapping/_objects/base-item";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";

export enum MapItemType {
  USER = "user",
  BASE = "base",
}

export interface Attrs extends Record<string, unknown> {
  originId: number | null; // The original mapItem this is a copy of.
  parentId: number | null; // The parent mapItem this is a copy of.
  coords: Coord; // Updated to new Coord structure
  ref: {
    itemType: MapItemType; // Will be 'BASE' for all items except root
    itemId: number;
  };
  itemType: MapItemType; // Explicitly store item type here
}

export type ShallNotUpdate = {
  parentId?: undefined;
  originId?: undefined;
  itemType?: undefined;
  // coords might be updatable via a move operation, but not directly here.
};

export interface RelatedItems {
  ref: BaseItemWithId;
  parent: MapItemWithId | null;
  origin: MapItemWithId | null;
}

export interface RelatedLists {
  neighbors: MapItemWithId[];
}

export interface MapItemConstructorArgs
  extends GenericAggregateConstructorArgs<
    Partial<Attrs> & Pick<Attrs, "coords" | "itemType">, // coords, itemType are required
    Partial<RelatedItems> & { ref: BaseItemWithId },
    RelatedLists
  > {
  attrs: Partial<Attrs> & Pick<Attrs, "coords" | "itemType">; // coords, itemType are required
  ref: BaseItemWithId;
  neighbors?: MapItemWithId[];
  parent?: MapItemWithId | null;
  origin?: MapItemWithId | null;
}

export type MapItemIdr =
  | { id: number }
  | {
      attrs: {
        coords: Coord;
      };
    };

export class MapItem extends GenericAggregate<
  Attrs,
  RelatedItems,
  RelatedLists
> {
  readonly neighbors: MapItem[];
  readonly ref: BaseItemWithId;
  readonly parent: MapItemWithId | null;
  readonly origin: MapItemWithId | null;

  constructor(args: MapItemConstructorArgs) {
    const {
      ref,
      neighbors = [],
      parent = null,
      origin = null,
      attrs,
      ...rest
    } = args;

    // Initial validation for USER type items before super() call if possible,
    // or ensure these are checked in validate() which is called after super()
    if (attrs.itemType === MapItemType.USER) {
      if (parent !== null || attrs.parentId !== null) {
        throw new Error(MAPPING_ERRORS.USER_ITEM_CANNOT_HAVE_PARENT);
      }
    } else if (parent === null && attrs.parentId === null) {
      // This implies it's a root item, which must be USER type
      throw new Error(MAPPING_ERRORS.BASE_ITEM_MUST_HAVE_PARENT);
    }

    super({
      ...rest,
      attrs: {
        originId: attrs.originId ?? origin?.id ?? null,
        parentId: attrs.parentId ?? parent?.id ?? null,
        coords: attrs.coords, // coords is now mandatory
        ref: attrs.ref ?? {
          // itemType in ref should always be BASE as per new design
          // The actual MapItemType is stored directly in attrs.itemType
          itemType: MapItemType.BASE,
          itemId: ref.id,
        },
        itemType: attrs.itemType, // itemType is now mandatory
      },
      relatedLists: { neighbors },
      relatedItems: { ref, parent, origin },
    });

    this.neighbors = neighbors;
    this.ref = ref;
    this.parent = parent; // parent is passed from args
    this.origin = origin; // origin is passed from args

    MapItem.validate(this);
  }

  public static validate(item: MapItem) {
    MapItem.validateCoords(item); // Keep general coord validation
    MapItem.validateParentChildRelationship(item); // New validation method
  }

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
    MapItem.validateNeighborsCount(item);
    MapItem.validateNeighborDirections(item);
  }

  private static validateNeighborsCount(item: MapItem) {
    const neighbors = item.neighbors;
    if (neighbors.length > 6) {
      throw new Error(MAPPING_ERRORS.INVALID_NEIGHBORS_COUNT);
    }
  }

  private static validateNeighborDirections(item: MapItem) {
    MapItem.checkNeighborsDepth(item);
    MapItem.checkNeighborsPath(item);
    const occupiedDirections = new Set<Direction>();
    for (const neighbor of item.neighbors) {
      const direction = neighbor.attrs.coords.path[
        neighbor.attrs.coords.path.length - 1
      ]!;
      if (occupiedDirections.has(direction)) {
        throw new Error(MAPPING_ERRORS.INVALID_NEIGHBOR_DIRECTION);
      }
      occupiedDirections.add(direction);
    }
  }

  public static isCenter(item: MapItem): boolean {
    // "Center" is now relative to a USER's root item.
    // A root USER item has no parent.
    return (
      item.attrs.itemType === MapItemType.USER && item.attrs.parentId === null
    );
  }

  private static checkNeighborsDepth(item: MapItem) {
    const neighbors = item.neighbors;
    for (const neighbor of neighbors) {
      const parentDepth = item.attrs.coords.path.length;
      const itemDepth = neighbor.attrs.coords.path.length;
      if (itemDepth !== parentDepth + 1) {
        throw new Error(MAPPING_ERRORS.INVALID_PARENT_LEVEL);
      }
    }
  }

  private static checkNeighborsPath(item: MapItem) {
    const neighbors = item.neighbors;
    const itemPath = item.attrs.coords.path;
    const itemUserId = item.attrs.coords.userId;
    const itemGroupId = item.attrs.coords.groupId;

    for (const neighbor of neighbors) {
      const neighborPath = neighbor.attrs.coords.path;
      const neighborUserId = neighbor.attrs.coords.userId;
      const neighborGroupId = neighbor.attrs.coords.groupId;

      if (neighborUserId !== itemUserId || neighborGroupId !== itemGroupId) {
        throw new Error(MAPPING_ERRORS.CHILD_COORDS_MUST_MATCH_PARENT);
      }

      // A neighbor's path should be exactly one element longer than the item's path
      // and should contain the item's path as a prefix
      if (
        neighborPath.length !== itemPath.length + 1 ||
        !itemPath.every((dir, i) => dir === neighborPath[i])
      ) {
        throw new Error(MAPPING_ERRORS.INVALID_NEIGHBOR_PATH);
      }
    }
  }
}

export type MapItemWithId = MapItem & { id: number };
