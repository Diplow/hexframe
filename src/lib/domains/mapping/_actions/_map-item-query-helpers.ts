import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { type MapItemWithId } from "~/lib/domains/mapping/_objects";
import {
  type Coord,
  CoordSystem,
} from "~/lib/domains/mapping/utils/hex-coordinates";
import { MAPPING_ERRORS } from "../types/errors";

export class MapItemQueryHelpers {
  constructor(
    private readonly mapItems: MapItemRepository,
    private readonly baseItems: BaseItemRepository,
  ) {}

  async getParent(coords: Coord): Promise<MapItemWithId | null> {
    if (CoordSystem.isCenter(coords)) return null;

    const parentCoords = CoordSystem.getParentCoord(coords);
    if (!parentCoords) {
      throw new Error(
        `${MAPPING_ERRORS.FAILED_PARENT_COORDS} - unable to determine parent coordinates.`,
      );
    }

    try {
      return await this.mapItems.getOneByIdr({
        idr: {
          attrs: {
            coords: parentCoords,
          },
        },
      });
    } catch (error) {
      console.warn(
        `Parent not found for coords ${CoordSystem.createId(coords)}. This may be expected for a new root item path.`,
        error,
      );
      return null;
    }
  }

  async getDescendants(parentId: number): Promise<MapItemWithId[]> {
    try {
      const parent = await this.mapItems.getOne(parentId);
      if (!parent) {
        console.error(
          `Parent item with ID ${parentId} not found for getDescendants.`,
        );
        return [];
      }

      const descendants = await this.mapItems.getDescendantsByParent({
        parentUserId: parent.attrs.coords.userId,
        parentGroupId: parent.attrs.coords.groupId,
        parentPath: parent.attrs.coords.path,
      });

      return descendants;
    } catch (error) {
      console.error(`Failed to get descendants for parent ${parentId}:`, error);
      return [];
    }
  }

  async getAncestors(itemId: number): Promise<MapItemWithId[]> {
    try {
      const item = await this.mapItems.getOne(itemId);
      if (!item) {
        console.error(
          `Item with ID ${itemId} not found for getAncestors.`,
        );
        return [];
      }

      const ancestors: MapItemWithId[] = [];
      let currentCoords = item.attrs.coords;

      // Walk up the tree from the item to the root
      while (!CoordSystem.isCenter(currentCoords)) {
        const parentCoords = CoordSystem.getParentCoord(currentCoords);
        if (!parentCoords) break;

        const parent = await this.mapItems.getOneByIdr({
          idr: {
            attrs: {
              coords: parentCoords,
            },
          },
        });

        if (parent) {
          ancestors.unshift(parent); // Add to beginning to maintain root->item order
          currentCoords = parent.attrs.coords;
        } else {
          // Parent not found, stop traversing
          break;
        }
      }

      return ancestors;
    } catch (error) {
      console.error(`Failed to get ancestors for item ${itemId}:`, error);
      return [];
    }
  }

  async getItemsForOwnerGroup({
    userId,
    groupId,
  }: {
    userId: number;
    groupId: number;
  }): Promise<MapItemWithId[]> {
    const rootItem = await this.mapItems.getRootItem(userId, groupId);
    if (!rootItem) {
      return [];
    }
    const descendants = await this.getDescendants(rootItem.id);
    return [rootItem, ...descendants];
  }

  async getMapItem({ coords }: { coords: Coord }): Promise<MapItemWithId> {
    try {
      return await this.mapItems.getOneByIdr({
        idr: {
          attrs: {
            coords,
          },
        },
      });
    } catch {
      throw new Error(
        `${MAPPING_ERRORS.ITEM_NOT_FOUND} at coords: ${CoordSystem.createId(coords)}`,
      );
    }
  }
}
