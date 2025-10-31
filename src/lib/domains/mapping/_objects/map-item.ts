import {
  GenericAggregate,
  type GenericAggregateConstructorArgs,
} from "~/lib/domains/utils/generic-objects";
import {
  type Coord,
} from "~/lib/domains/mapping/utils";
import type { BaseItemWithId } from "~/lib/domains/mapping/_objects/base-item";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";
import { MapItemValidation } from "~/lib/domains/mapping/_objects/map-item-validation";

export enum MapItemType {
  USER = "user",
  BASE = "base",
}

export interface Attrs extends Record<string, unknown> {
  parentId: number | null; // The parent mapItem this is a child of.
  coords: Coord; // Updated to new Coord structure
  ref: {
    itemType: MapItemType; // Will be 'BASE' for all items except root
    itemId: number;
  };
  itemType: MapItemType; // Explicitly store item type here
}

export type ShallNotUpdate = {
  parentId?: undefined;
  itemType?: undefined;
  // coords might be updatable via a move operation, but not directly here.
};

export interface RelatedItems {
  ref: BaseItemWithId;
  parent: MapItemWithId | null;
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

  constructor(args: MapItemConstructorArgs) {
    const {
      ref,
      neighbors = [],
      parent = null,
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
      relatedItems: { ref, parent },
    });

    this.neighbors = neighbors;
    this.ref = ref;
    this.parent = parent; // parent is passed from args

    MapItem.validate(this);
  }

  public static validate(item: MapItem) {
    MapItemValidation.validateCoords(item);
    MapItemValidation.validateParentChildRelationship(item);
  }

  public static validateNeighbors(item: MapItem) {
    MapItemValidation.validateNeighbors(item);
  }

  public static isCenter(item: MapItem): boolean {
    // "Center" is now relative to a USER's root item.
    // A root USER item has no parent.
    return (
      item.attrs.itemType === MapItemType.USER && item.attrs.parentId === null
    );
  }
}

export type MapItemWithId = MapItem & { id: number };
