import {
  type MapItemAttrs,
  type MapItemRelatedItems,
  type MapItemRelatedLists,
  type MapItemWithId,
  type Visibility,
  type ItemTypeValue,
} from "~/lib/domains/mapping/_objects";
import { type GenericRepository } from "~/lib/domains/utils";
import { type Coord } from "~/lib/domains/mapping/utils";
import { type RequesterContext } from "~/lib/domains/mapping/types";

export type MapItemIdr =
  | { id: number }
  | {
      attrs: {
        coords: Coord;
      };
    };

/**
 * Base type from GenericRepository, excluding methods we override with RequesterContext.
 * This allows us to add visibility filtering without breaking the generic interface.
 */
type BaseMapItemRepository = Omit<
  GenericRepository<
    MapItemAttrs,
    MapItemRelatedItems,
    MapItemRelatedLists,
    MapItemWithId,
    MapItemIdr
  >,
  'getOne' | 'getOneByIdr' | 'exists' | 'getMany' | 'getManyByIdr'
>;

export interface MapItemRepository extends BaseMapItemRepository {
  /**
   * Override getOne to support visibility filtering.
   * @param id - ID of the item
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   */
  getOne(id: number, requester: RequesterContext): Promise<MapItemWithId>;

  /**
   * Override getOneByIdr to support visibility filtering.
   * @param params - Object containing the identifier
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   */
  getOneByIdr(
    params: { idr: MapItemIdr; limit?: number; offset?: number },
    requester: RequesterContext
  ): Promise<MapItemWithId>;

  /**
   * Override exists to support visibility filtering.
   * @param params - Object containing the identifier
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   */
  exists(params: { idr: MapItemIdr }, requester: RequesterContext): Promise<boolean>;

  /**
   * Override getMany to support visibility filtering.
   * @param params - Pagination parameters
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   */
  getMany(
    params: { limit?: number; offset?: number },
    requester: RequesterContext
  ): Promise<MapItemWithId[]>;

  /**
   * Override getManyByIdr to support visibility filtering.
   * @param params - Object containing identifiers and pagination
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   */
  getManyByIdr(
    params: { idrs: MapItemIdr[]; limit?: number; offset?: number },
    requester: RequesterContext
  ): Promise<MapItemWithId[]>;

  /**
   * Get the root MapItem (type USER) for a specific user and group.
   * @param userId - The owner's user ID
   * @param groupId - The group ID
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   */
  getRootItem(
    userId: string,
    groupId: number,
    requester: RequesterContext
  ): Promise<MapItemWithId | null>;

  /**
   * Get all root MapItems (type USER) for a specific user across all their groups.
   * @param userId - The owner's user ID
   * @param requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   * @param limit - Optional limit for pagination
   * @param offset - Optional offset for pagination
   */
  getRootItemsForUser(
    userId: string,
    requester: RequesterContext,
    limit?: number,
    offset?: number
  ): Promise<MapItemWithId[]>;

  /**
   * Get all descendants of a parent map item (direct and indirect children).
   *
   * @param parentPath The parent's coordinate path that children paths must start with
   * @param parentUserId The userId from the parent's Coord
   * @param parentGroupId The groupId from the parent's Coord
   * @param limit Optional limit for pagination
   * @param offset Optional offset for pagination
   * @param requester The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   * @returns Array of map items that are descendants of the specified parent
   */
  getDescendantsByParent({
    parentPath,
    parentUserId,
    parentGroupId,
    limit,
    offset,
    requester,
  }: {
    parentPath: Coord["path"];
    parentUserId: string;
    parentGroupId: number;
    limit?: number;
    offset?: number;
    requester: RequesterContext;
  }): Promise<MapItemWithId[]>;

  /**
   * Get descendants of a parent map item limited by generation depth.
   *
   * @param parentPath The parent's coordinate path that children paths must start with
   * @param parentUserId The userId from the parent's Coord
   * @param parentGroupId The groupId from the parent's Coord
   * @param maxGenerations Maximum number of generations to retrieve (0 = no descendants, 1 = direct children only, etc.)
   * @param limit Optional limit for pagination
   * @param offset Optional offset for pagination
   * @param requester The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   * @returns Array of map items that are descendants within the specified generation limit
   */
  getDescendantsWithDepth({
    parentPath,
    parentUserId,
    parentGroupId,
    maxGenerations,
    limit,
    offset,
    requester,
  }: {
    parentPath: Coord["path"];
    parentUserId: string;
    parentGroupId: number;
    maxGenerations: number;
    limit?: number;
    offset?: number;
    requester: RequesterContext;
  }): Promise<MapItemWithId[]>;

  /**
   * Create multiple MapItems in a single bulk operation
   *
   * Efficiently creates multiple MapItem records.
   *
   * @param items - Array of MapItem data to create (attrs + ref)
   * @returns Array of created MapItems
   * @throws Error if creation fails
   */
  createMany(
    items: Array<{
      attrs: MapItemAttrs;
      ref: MapItemRelatedItems["ref"];
    }>
  ): Promise<MapItemWithId[]>;

  /**
   * Optimized context fetch for a center tile in a single query
   *
   * Fetches parent, center, composed, children, and grandchildren tiles
   * based on configuration, avoiding redundant queries and direction 0 issues.
   *
   * @param config - Configuration specifying which relationships to include
   * @param config.requester - The requester context (RequesterUserId for users, SYSTEM_INTERNAL for internal ops)
   * @returns Grouped map items by relationship
   */
  getContextForCenter(config: {
    centerPath: Coord["path"];
    userId: string;
    groupId: number;
    includeParent: boolean;
    includeComposed: boolean;
    includeChildren: boolean;
    includeGrandchildren: boolean;
    requester: RequesterContext;
  }): Promise<{
    parent: MapItemWithId | null;
    center: MapItemWithId;
    composed: MapItemWithId[];
    children: MapItemWithId[];
    grandchildren: MapItemWithId[];
    hexPlan: MapItemWithId | null;
  }>;

  /**
   * Batch update moved item AND all its descendants in a single atomic operation.
   * This prevents duplicate key conflicts from two-step updates.
   *
   * @param movedItemId - ID of the item being moved
   * @param oldCoords - Original coordinates of the moved item
   * @param newCoords - New coordinates of the moved item
   * @param newParentId - New parent ID for the moved item
   * @returns Number of items updated
   */
  batchUpdateItemAndDescendants(params: {
    movedItemId: number;
    oldCoords: Coord;
    newCoords: Coord;
    newParentId: number | null;
  }): Promise<number>;

  /**
   * Update the visibility of a map item.
   *
   * @param itemId - ID of the item to update
   * @param visibility - New visibility setting
   * @returns The updated map item
   */
  updateVisibility(itemId: number, visibility: Visibility): Promise<MapItemWithId>;

  /**
   * Update the item type of a map item.
   * Note: Cannot change to/from USER type - that's system-controlled.
   *
   * @param itemId - ID of the item to update
   * @param itemType - New item type
   * @returns The updated map item
   */
  updateItemType(itemId: number, itemType: ItemTypeValue): Promise<MapItemWithId>;

  /**
   * Batch update the visibility of a tile and all its descendants in a single atomic operation.
   * Descendants are identified by path prefix matching.
   *
   * @param coords - Coordinates of the root tile
   * @param visibility - New visibility value
   * @returns Number of items updated
   */
  batchUpdateVisibilityWithDescendants(
    coords: Coord,
    visibility: Visibility,
  ): Promise<number>;

  /**
   * Batch update the item type of a tile and all its STRUCTURAL descendants.
   * Only updates descendants reached via positive directions (1-6), ignoring
   * hexplans (direction 0) and composition children (negative directions).
   *
   * @param coords - Coordinates of the root tile
   * @param itemType - New item type value
   * @returns Number of items updated
   */
  batchUpdateItemTypeWithStructuralDescendants(
    coords: Coord,
    itemType: ItemTypeValue,
  ): Promise<number>;
}
