import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { type MapItemWithId, MapItemType } from "~/lib/domains/mapping/_objects";
import {
  type Coord,
  CoordSystem,
  type Direction,
} from "~/lib/domains/mapping/utils";
import { MAPPING_ERRORS } from "~/lib/domains/mapping/types/errors";

export class MapItemMovementHelpers {
  constructor(
    private readonly mapItems: MapItemRepository,
    private readonly baseItems: BaseItemRepository,
  ) {}

  async validateCoordsForMove(
    oldCoords: Coord,
    newCoords: Coord,
    getMapItem: (coords: Coord) => Promise<MapItemWithId>,
    getParent: (coords: Coord) => Promise<MapItemWithId | null>,
  ) {
    await this._validateUserItemConstraints(oldCoords, newCoords, getMapItem);
    await this._validateUserSpaceConstraints(oldCoords, newCoords);

    const sourceParent = await getParent(oldCoords);
    const targetParent = await getParent(newCoords);

    this._validateParentExistence(sourceParent, oldCoords);
    this._validateParentExistence(targetParent, newCoords);

    return { sourceParent, targetParent };
  }

  async moveItemToTemporaryLocation(
    targetItem: MapItemWithId,
    targetParent: MapItemWithId | null,
    move: (
      item: MapItemWithId,
      newCoords: Coord,
      newParent: MapItemWithId | null,
    ) => Promise<void>,
  ): Promise<Coord> {
    const tempCoords = this._generateTemporaryCoords(targetItem, targetParent);
    
    // Check if there's already an item at the temporary position
    // This can happen if a previous swap failed and left an orphaned item
    try {
      const existingTempItem = await this.mapItems
        .getOneByIdr({ idr: { attrs: { coords: tempCoords } } })
        .catch(() => null);
        
      if (existingTempItem) {
        console.warn(`[MOVE CLEANUP] Found orphaned item ${existingTempItem.id} at temporary position ${CoordSystem.createId(tempCoords)}. This likely resulted from a previous failed swap operation.`);
        // Note: We don't automatically delete it as it might be legitimate data
        // Instead, we'll use a different temporary position
        const alternativeTempCoords = this._generateAlternativeTemporaryCoords(targetItem, targetParent);
        await move(targetItem, alternativeTempCoords, targetParent);
        return alternativeTempCoords;
      }
    } catch (error) {
      console.error(`[MOVE CLEANUP] Error checking temporary position:`, error);
      // Continue with original temp coords if check fails
    }
    
    await move(targetItem, tempCoords, targetParent);
    return tempCoords;
  }

  async move(
    item: MapItemWithId,
    newCoords: Coord,
    newParent: MapItemWithId | null,
    getDescendants: (parentId: number) => Promise<MapItemWithId[]>,
  ) {
    const oldCoords: Coord = item.attrs.coords;
    const descendants = await getDescendants(item.id);

    await this._updateItemCoordinates(item, newCoords, newParent);
    await this._updateDescendantCoordinates(descendants, oldCoords, newCoords);
  }

  private async _validateUserItemConstraints(
    oldCoords: Coord,
    newCoords: Coord,
    getMapItem: (coords: Coord) => Promise<MapItemWithId>,
  ) {
    if (CoordSystem.isCenter(oldCoords) || CoordSystem.isCenter(newCoords)) {
      const item = await getMapItem(oldCoords);
      if (item.attrs.itemType === MapItemType.USER) {
        throw new Error(
          "Root USER items cannot be moved to become children, and their userId/groupId cannot change via move.",
        );
      }
    }
  }

  private async _validateUserSpaceConstraints(
    oldCoords: Coord,
    newCoords: Coord,
  ) {
    if (
      oldCoords.userId !== newCoords.userId ||
      oldCoords.groupId !== newCoords.groupId
    ) {
      throw new Error(
        "Moving items across different user/group spaces (userId/groupId) is not supported by this action.",
      );
    }
  }

  private _validateParentExistence(
    parent: MapItemWithId | null,
    coords: Coord,
  ) {
    if (!parent && coords.path.length > 0) {
      throw new Error(
        `${MAPPING_ERRORS.FAILED_PARENT_COORDS} for coordinates.`,
      );
    }
  }

  private _generateTemporaryCoords(
    targetItem: MapItemWithId,
    targetParent: MapItemWithId | null,
  ): Coord {
    const NON_EXISTING_DIRECTION = 7 as Direction;
    const parentPath: Direction[] = targetParent ? targetParent.attrs.coords.path : [];
    const tempPath: Direction[] = [
      ...parentPath,
      NON_EXISTING_DIRECTION,
    ];

    const targetCoords = targetItem.attrs.coords;
    return {
      userId: targetCoords.userId,
      groupId: targetCoords.groupId,
      path: tempPath,
    };
  }

  private _generateAlternativeTemporaryCoords(
    targetItem: MapItemWithId,
    targetParent: MapItemWithId | null,
  ): Coord {
    // Use direction 8 as alternative temporary position
    // In hexagonal coordinate system, we typically use directions 1-6,
    // so 7 and 8 are both outside the normal range
    const ALTERNATIVE_NON_EXISTING_DIRECTION = 8 as Direction;
    const parentPath: Direction[] = targetParent ? targetParent.attrs.coords.path : [];
    const tempPath: Direction[] = [
      ...parentPath,
      ALTERNATIVE_NON_EXISTING_DIRECTION,
    ];

    const targetCoords = targetItem.attrs.coords;
    return {
      userId: targetCoords.userId,
      groupId: targetCoords.groupId,
      path: tempPath,
    };
  }

  private async _updateItemCoordinates(
    item: MapItemWithId,
    newCoords: Coord,
    newParent: MapItemWithId | null,
  ) {
    await this.mapItems.updateByIdr({
      idr: { id: item.id },
      attrs: {
        coords: newCoords,
        parentId: newParent?.id ?? null,
      },
    });
  }

  private async _updateDescendantCoordinates(
    descendants: MapItemWithId[],
    oldCoords: Coord,
    newCoords: Coord,
  ) {
    const sortedDescendants = descendants.sort(
      (a, b) => a.attrs.coords.path.length - b.attrs.coords.path.length,
    );

    for (const descendant of sortedDescendants) {
      const descendantPath = descendant.attrs.coords.path;
      const pathSuffix: Direction[] = descendantPath.slice(
        oldCoords.path.length,
      );
      const newPath: Direction[] = [...newCoords.path, ...pathSuffix];
      const newDescendantCoords: Coord = {
        userId: newCoords.userId,
        groupId: newCoords.groupId,
        path: newPath,
      };

      await this.mapItems.updateByIdr({
        idr: { id: descendant.id },
        attrs: { coords: newDescendantCoords },
      });
    }
  }
}
