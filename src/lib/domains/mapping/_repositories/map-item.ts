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
  getRootItem(userId: number, groupId: number): Promise<MapItemWithId | null>;

  /**
   * Get all root MapItems (type USER) for a specific user across all their groups.
   */
  getRootItemsForUser(
    userId: number,
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
    parentUserId: number;
    parentGroupId: number;
    limit?: number;
    offset?: number;
  }): Promise<MapItemWithId[]>;
}
