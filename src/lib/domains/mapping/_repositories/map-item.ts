import {
  type MapItemAttrs,
  type MapItemRelatedItems,
  type MapItemRelatedLists,
  type MapItemWithId,
} from "~/lib/domains/mapping/_objects";
import { type GenericRepository } from "~/lib/domains/utils";
import { type Coord } from "~/lib/domains/mapping/utils";

export type MapItemIdr =
  | { id: number }
  | {
      attrs: {
        coords: Coord;
      };
    };

export interface MapItemRepository
  extends GenericRepository<
    MapItemAttrs,
    MapItemRelatedItems,
    MapItemRelatedLists,
    MapItemWithId,
    MapItemIdr
  > {
  /**
   * Get the root MapItem (type USER) for a specific user and group.
   */
  getRootItem(userId: string, groupId: number): Promise<MapItemWithId | null>;

  /**
   * Get all root MapItems (type USER) for a specific user across all their groups.
   */
  getRootItemsForUser(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<MapItemWithId[]>;

  /**
   * Get all descendants of a parent map item (direct and indirect children).
   *
   * @param parentPath The parent's coordinate path that children paths must start with
   * @param parentUserId The userId from the parent's Coord
   * @param parentGroupId The groupId from the parent's Coord
   * @param limit Optional limit for pagination
   * @param offset Optional offset for pagination
   * @returns Array of map items that are descendants of the specified parent
   */
  getDescendantsByParent({
    parentPath,
    parentUserId,
    parentGroupId,
    limit,
    offset,
  }: {
    parentPath: Coord["path"];
    parentUserId: string;
    parentGroupId: number;
    limit?: number;
    offset?: number;
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
   * @returns Array of map items that are descendants within the specified generation limit
   */
  getDescendantsWithDepth({
    parentPath,
    parentUserId,
    parentGroupId,
    maxGenerations,
    limit,
    offset,
  }: {
    parentPath: Coord["path"];
    parentUserId: string;
    parentGroupId: number;
    maxGenerations: number;
    limit?: number;
    offset?: number;
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
  }): Promise<{
    parent: MapItemWithId | null;
    center: MapItemWithId;
    composed: MapItemWithId[];
    children: MapItemWithId[];
    grandchildren: MapItemWithId[];
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
}
