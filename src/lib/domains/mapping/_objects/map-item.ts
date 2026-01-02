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

/**
 * MapItemType defines the semantic classification of tiles.
 *
 * - USER: Root tile for each user's map. Only tile type that can have parentId=null.
 *   Structural constraint: exactly one per user, at the center of their map.
 *
 * - ORGANIZATIONAL: Structural grouping tiles (e.g., "Plans", "Interests").
 *   Used for navigation and categorization. Always visible to help orient.
 *
 * - CONTEXT: Reference material tiles to explore on-demand.
 *   Background knowledge that agents should explore when relevant, not preload.
 *
 * - SYSTEM: Executable capability tiles that can be invoked like a skill.
 *   Agents can invoke these via hexecute when needed.
 *
 * Migration note: Previously there was only USER and BASE. BASE has been split
 * into ORGANIZATIONAL, CONTEXT, and SYSTEM for semantic agent behavior.
 * Tiles with null itemType should be treated as unclassified legacy tiles.
 */
export enum MapItemType {
  USER = "user",
  ORGANIZATIONAL = "organizational",
  CONTEXT = "context",
  SYSTEM = "system",
}

/**
 * Non-user item types that can be created/modified via API.
 * USER type is system-controlled and excluded from this type.
 */
export type NonUserMapItemType =
  | MapItemType.ORGANIZATIONAL
  | MapItemType.CONTEXT
  | MapItemType.SYSTEM;

/**
 * String literals for non-user item types (for API contracts).
 * Use when interfacing with external systems that expect string literals.
 */
export type NonUserMapItemTypeString = "organizational" | "context" | "system";

export enum Visibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

/**
 * String literal type for visibility (for API contracts).
 * Use when interfacing with external systems that expect string literals.
 */
export type VisibilityString = "public" | "private";

export interface Attrs extends Record<string, unknown> {
  parentId: number | null; // The parent mapItem this is a child of.
  coords: Coord; // Updated to new Coord structure
  baseItemId: number; // Foreign key to the BaseItem containing title, content, etc.
  itemType: MapItemType; // Semantic tile type: USER, ORGANIZATIONAL, CONTEXT, or SYSTEM
  visibility: Visibility; // Whether the tile is publicly visible
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
      throw new Error(MAPPING_ERRORS.NON_USER_ITEM_MUST_HAVE_PARENT);
    }

    super({
      ...rest,
      attrs: {
        parentId: attrs.parentId ?? parent?.id ?? null,
        coords: attrs.coords, // coords is now mandatory
        baseItemId: attrs.baseItemId ?? ref.id,
        itemType: attrs.itemType, // itemType is now mandatory
        visibility: attrs.visibility ?? Visibility.PRIVATE,
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
