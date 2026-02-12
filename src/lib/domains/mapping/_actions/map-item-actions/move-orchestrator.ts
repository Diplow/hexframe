import type { MapItemWithId } from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { MapItemRepository, BaseItemRepository } from "~/lib/domains/mapping/_repositories";
import type { MapItemQueryHelpers } from "~/lib/domains/mapping/_actions/_map-item-query-helpers";
import type { MapItemMovementHelpers } from "~/lib/domains/mapping/_actions/_map-item-movement-helpers";
import type { ValidationStrategy } from "~/lib/domains/mapping/_actions/map-item-actions/validation-strategy";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import { SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

interface MoveContext {
  oldCoords: Coord;
  newCoords: Coord;
  repositories: {
    mapItems: MapItemRepository;
    baseItems: BaseItemRepository;
  };
  helpers: {
    queryHelpers: MapItemQueryHelpers;
    movementHelpers: MapItemMovementHelpers;
  };
  validationStrategy: ValidationStrategy;
}

interface MoveResult {
  modifiedItems: MapItemWithId[];
  movedItemId: number;
  affectedCount: number;
}

export class MoveOrchestrator {
  async orchestrateMove(context: MoveContext): Promise<MoveResult> {
    const { oldCoords, newCoords, repositories, helpers, validationStrategy } = context;
    const { queryHelpers, movementHelpers } = helpers;
    
    const sourceItem = await this._fetchSourceItem(queryHelpers, oldCoords);
    await this._validateMove(validationStrategy, sourceItem, newCoords);
    
    const moveData = await this._prepareMoveData(
      movementHelpers,
      queryHelpers,
      oldCoords,
      newCoords
    );
    
    const targetItem = await this._fetchTargetItem(repositories.mapItems, newCoords);
    
    const tempCoords = await this._moveTargetToTemp(
      targetItem,
      moveData.sourceParent,
      oldCoords,
      movementHelpers,
      queryHelpers
    );
    
    const modifiedItems = await this._executeMoveSequence(
      sourceItem,
      targetItem,
      newCoords,
      oldCoords,
      moveData,
      tempCoords,
      movementHelpers,
      queryHelpers,
      repositories.mapItems
    );
    
    return {
      modifiedItems,
      movedItemId: sourceItem.id,
      affectedCount: modifiedItems.length,
    };
  }

  private async _fetchSourceItem(
    queryHelpers: MapItemQueryHelpers,
    coords: Coord
  ): Promise<MapItemWithId> {
    return await queryHelpers.getMapItem({ coords });
  }

  private async _validateMove(
    validationStrategy: ValidationStrategy,
    sourceItem: MapItemWithId,
    newCoords: Coord
  ): Promise<void> {
    validationStrategy.validateUserItemMove(sourceItem, newCoords);
    validationStrategy.validateUserSpaceMove(sourceItem, newCoords);
  }

  private async _prepareMoveData(
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers,
    oldCoords: Coord,
    newCoords: Coord
  ) {
    return await movementHelpers.validateCoordsForMove(
      oldCoords,
      newCoords,
      (coords) => queryHelpers.getMapItem({ coords }),
      (coords) => queryHelpers.getParent(coords)
    );
  }

  private async _fetchTargetItem(
    mapItems: MapItemRepository,
    coords: Coord
  ): Promise<MapItemWithId | null> {
    // Use SYSTEM_INTERNAL for internal move operations - no visibility filtering
    return await mapItems
      .getOneByIdr({ idr: { attrs: { coords } } }, SYSTEM_INTERNAL)
      .catch(() => null);
  }

  private async _moveTargetToTemp(
    targetItem: MapItemWithId | null,
    sourceParent: MapItemWithId | null,
    oldCoords: Coord,
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers
  ): Promise<Coord | null> {
    if (!targetItem) return null;

    if ((targetItem.attrs.itemType as MapItemType) === MapItemType.USER && oldCoords.path.length > 0) {
      throw new Error("Cannot displace a USER (root) item with a child item.");
    }

    return await movementHelpers.moveItemToTemporaryLocation(
      targetItem,
      sourceParent,
      (item, coords, parent) =>
        movementHelpers.move(item, coords, parent, (parentId) =>
          queryHelpers.getDescendants(parentId)
        )
    );
  }

  private async _executeMoveSequence(
    sourceItem: MapItemWithId,
    targetItem: MapItemWithId | null,
    newCoords: Coord,
    oldCoords: Coord,
    moveData: { sourceParent: MapItemWithId | null; targetParent: MapItemWithId | null },
    tempCoords: Coord | null,
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers,
    mapItems: MapItemRepository
  ): Promise<MapItemWithId[]> {
    const modifiedItems: MapItemWithId[] = [];
    
    await this._moveSourceToTarget(
      sourceItem,
      newCoords,
      moveData.targetParent,
      movementHelpers,
      queryHelpers
    );
    
    const movedItem = await this._fetchMovedItem(mapItems, sourceItem.id);
    modifiedItems.push(movedItem);
    
    const updatedDescendants = await queryHelpers.getDescendants(sourceItem.id);
    modifiedItems.push(...updatedDescendants);
    
    if (targetItem && tempCoords) {
      await this._moveTargetFromTempToSource(
        targetItem,
        oldCoords,
        moveData.sourceParent,
        movementHelpers,
        queryHelpers,
        mapItems
      );
      
      const swappedItems = await this._collectSwappedItems(
        targetItem.id,
        mapItems,
        queryHelpers
      );
      modifiedItems.push(...swappedItems);
    }
    
    return modifiedItems;
  }

  private async _moveSourceToTarget(
    sourceItem: MapItemWithId,
    newCoords: Coord,
    targetParent: MapItemWithId | null,
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers
  ): Promise<void> {
    await movementHelpers.move(
      sourceItem,
      newCoords,
      targetParent,
      (parentId) => queryHelpers.getDescendants(parentId)
    );
  }

  private async _fetchMovedItem(
    mapItems: MapItemRepository,
    itemId: number
  ): Promise<MapItemWithId> {
    // Use SYSTEM_INTERNAL for internal move operations - no visibility filtering
    const movedItem = await mapItems.getOne(itemId, SYSTEM_INTERNAL);
    if (!movedItem) {
      throw new Error("Failed to retrieve moved item");
    }
    return movedItem;
  }

  private async _moveTargetFromTempToSource(
    targetItem: MapItemWithId,
    oldCoords: Coord,
    sourceParent: MapItemWithId | null,
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers,
    mapItems: MapItemRepository
  ): Promise<void> {
    // Use SYSTEM_INTERNAL for internal move operations - no visibility filtering
    const targetItemAtTemp = await mapItems.getOne(targetItem.id, SYSTEM_INTERNAL);
    if (!targetItemAtTemp) {
      throw new Error("Failed to retrieve target item after moving to temporary position");
    }
    
    await movementHelpers.move(
      targetItemAtTemp,
      oldCoords,
      sourceParent,
      (parentId) => queryHelpers.getDescendants(parentId)
    );
  }

  private async _collectSwappedItems(
    targetItemId: number,
    mapItems: MapItemRepository,
    queryHelpers: MapItemQueryHelpers
  ): Promise<MapItemWithId[]> {
    const swappedItems: MapItemWithId[] = [];
    // Use SYSTEM_INTERNAL for internal move operations - no visibility filtering
    const swappedTargetItem = await mapItems.getOne(targetItemId, SYSTEM_INTERNAL);

    if (swappedTargetItem) {
      swappedItems.push(swappedTargetItem);
      const targetDescendants = await queryHelpers.getDescendants(targetItemId, SYSTEM_INTERNAL);
      swappedItems.push(...targetDescendants);
    }

    return swappedItems;
  }
}