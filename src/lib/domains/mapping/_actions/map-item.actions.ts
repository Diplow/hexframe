import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import {
  type BaseItemAttrs,
  type BaseItemWithId,
  type MapItemWithId,
  MapItemType,
} from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { MapItemIdr } from "~/lib/domains/mapping/_repositories/map-item";
import { MapItemCreationHelpers } from "~/lib/domains/mapping/_actions/_map-item-creation-helpers";
import { MapItemQueryHelpers } from "~/lib/domains/mapping/_actions/_map-item-query-helpers";
import { MapItemMovementHelpers } from "~/lib/domains/mapping/_actions/_map-item-movement-helpers";
import type { DatabaseTransaction } from "~/lib/domains/mapping/types/transaction";

export class MapItemActions {
  public readonly mapItems: MapItemRepository;
  private readonly baseItems: BaseItemRepository;
  private readonly creationHelpers: MapItemCreationHelpers;
  private readonly queryHelpers: MapItemQueryHelpers;
  private readonly movementHelpers: MapItemMovementHelpers;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.mapItems = repositories.mapItem;
    this.baseItems = repositories.baseItem;
    this.creationHelpers = new MapItemCreationHelpers(
      repositories.mapItem,
      repositories.baseItem,
    );
    this.queryHelpers = new MapItemQueryHelpers(
      repositories.mapItem,
      repositories.baseItem,
    );
    this.movementHelpers = new MapItemMovementHelpers(
      repositories.mapItem,
      repositories.baseItem,
    );
  }

  public async createMapItem({
    itemType,
    coords,
    title,
    descr,
    url,
    parentId,
  }: {
    itemType: MapItemType;
    coords: Coord;
    title?: string;
    descr?: string;
    url?: string;
    parentId?: number;
  }): Promise<MapItemWithId> {
    return await this.creationHelpers.createMapItem({
      itemType,
      coords,
      title,
      descr,
      url,
      parentId,
    });
  }

  public async updateRef(ref: BaseItemWithId, attrs: Partial<BaseItemAttrs>) {
    return await this.creationHelpers.updateRef(ref, attrs);
  }

  public async removeItem({ idr }: { idr: MapItemIdr }) {
    const { item, descendants } = await this._getItemAndDescendants(idr);
    await this._removeDescendantsAndItem(descendants, item.id);
  }

  public async getMapItem({
    coords,
  }: {
    coords: Coord;
  }): Promise<MapItemWithId> {
    return await this.queryHelpers.getMapItem({ coords });
  }

  public async moveMapItem({
    oldCoords,
    newCoords,
    tx,
  }: {
    oldCoords: Coord;
    newCoords: Coord;
    tx?: DatabaseTransaction;
  }) {
    // Get appropriate repositories (transaction-scoped if tx provided)
    const mapItems = tx && 'withTransaction' in this.mapItems 
      ? (this.mapItems as MapItemRepository & { withTransaction: (tx: DatabaseTransaction) => MapItemRepository }).withTransaction(tx)
      : this.mapItems;
    const baseItems = tx && 'withTransaction' in this.baseItems
      ? (this.baseItems as BaseItemRepository & { withTransaction: (tx: DatabaseTransaction) => BaseItemRepository }).withTransaction(tx)
      : this.baseItems;
      
    // Create helpers with appropriate repositories
    const queryHelpers = new MapItemQueryHelpers(mapItems, baseItems);
    const movementHelpers = new MapItemMovementHelpers(mapItems, baseItems);
    
    const sourceItem = await queryHelpers.getMapItem({ coords: oldCoords });
    this._validateUserItemMove(sourceItem, newCoords);
    this._validateUserSpaceMove(sourceItem, newCoords);

    const { sourceParent, targetParent } =
      await movementHelpers.validateCoordsForMove(
        oldCoords,
        newCoords,
        (coords) => queryHelpers.getMapItem({ coords }),
        (coords) => queryHelpers.getParent(coords),
      );

    const targetItem = await mapItems
      .getOneByIdr({ idr: { attrs: { coords: newCoords } } })
      .catch(() => null);
      
      
    const tempCoordsHoldingTarget = await this._handleTargetItemDisplacement(
      targetItem,
      sourceParent,
      oldCoords,
      movementHelpers,
      queryHelpers,
    );

    // Collect all items that will be modified
    const modifiedItems: MapItemWithId[] = [];
    
    // Step 2: Move source item to target position
    try {
      await movementHelpers.move(
        sourceItem,
        newCoords,
        targetParent,
        (parentId) => queryHelpers.getDescendants(parentId),
      );
    } catch (error) {
      console.error(`[MOVE STEP 2] Failed to move source item ${sourceItem.id}:`, error);
      throw error;
    }
    
    if (targetItem && tempCoordsHoldingTarget) {
      // Step 3: Move target item from temp to source's original position
      
      // Refetch the target item with its temporary coordinates
      const targetItemAtTemp = await mapItems.getOne(targetItem.id);
      if (!targetItemAtTemp) {
        console.error(`[MOVE STEP 3] Failed to retrieve target item ${targetItem.id} after moving to temporary position`);
        throw new Error("Failed to retrieve target item after moving to temporary position");
      }
      
      try {
        await movementHelpers.move(
          targetItemAtTemp,
          oldCoords,
          sourceParent,
          (parentId) => queryHelpers.getDescendants(parentId),
        );
      } catch (error) {
        console.error(`[MOVE STEP 3] Failed to move target item ${targetItem.id} from temp to source position:`, error);
        throw error;
      }
    }

    // Get the moved item with new coordinates
    const movedItem = await mapItems.getOne(sourceItem.id);
    if (!movedItem) {
      throw new Error("Failed to retrieve moved item");
    }
    modifiedItems.push(movedItem);
    
    // Get all descendants with their new coordinates
    const updatedDescendants = await queryHelpers.getDescendants(sourceItem.id);
    modifiedItems.push(...updatedDescendants);
    
    // If we swapped, also include the target item and its descendants
    if (targetItem && tempCoordsHoldingTarget) {
      const swappedTargetItem = await mapItems.getOne(targetItem.id);
      if (swappedTargetItem) {
        modifiedItems.push(swappedTargetItem);
        const targetDescendants = await queryHelpers.getDescendants(targetItem.id);
        modifiedItems.push(...targetDescendants);
      }
    }
    
    
    return {
      modifiedItems,
      movedItemId: sourceItem.id,
      affectedCount: modifiedItems.length,
    };
  }

  public async getDescendants(parentId: number): Promise<MapItemWithId[]> {
    return await this.queryHelpers.getDescendants(parentId);
  }

  public async getAncestors(itemId: number): Promise<MapItemWithId[]> {
    return await this.queryHelpers.getAncestors(itemId);
  }

  private async _getItemAndDescendants(idr: MapItemIdr) {
    let item: MapItemWithId | null = null;

    if ("id" in idr) {
      item = await this.mapItems.getOne(idr.id);
    } else if (idr.attrs?.coords) {
      item = await this.mapItems.getOneByIdr({ idr });
    } else {
      throw new Error("Invalid identifier for removeItem");
    }

    if (!item) {
      throw new Error(
        `MapItem not found with provided identifier: ${JSON.stringify(idr)}`,
      );
    }

    const descendants = await this.getDescendants(item.id);
    return { item, descendants };
  }

  private async _removeDescendantsAndItem(
    descendants: MapItemWithId[],
    itemId: number,
  ) {
    for (const descendant of descendants.reverse()) {
      await this.mapItems.remove(descendant.id);
    }
    await this.mapItems.remove(itemId);
  }

  private _validateUserItemMove(item: MapItemWithId, newCoords: Coord) {
    if (item.attrs.itemType === MapItemType.USER && newCoords.path.length > 0) {
      throw new Error(
        "USER (root) items cannot be moved to become child items.",
      );
    }
  }

  private _validateUserSpaceMove(item: MapItemWithId, newCoords: Coord) {
    if (
      item.attrs.itemType === MapItemType.USER &&
      (item.attrs.coords.userId !== newCoords.userId ||
        item.attrs.coords.groupId !== newCoords.groupId)
    ) {
      throw new Error(
        "USER (root) items cannot change their userId or groupId through a move operation.",
      );
    }

    if (
      item.attrs.coords.userId !== newCoords.userId ||
      item.attrs.coords.groupId !== newCoords.groupId
    ) {
      throw new Error("Cannot move item to a different userId/groupId space.");
    }
  }


  private async _handleTargetItemDisplacement(
    targetItem: MapItemWithId | null,
    sourceParent: MapItemWithId | null,
    oldCoords: Coord,
    movementHelpers: MapItemMovementHelpers,
    queryHelpers: MapItemQueryHelpers,
  ) {
    if (!targetItem) return null;

    if (
      targetItem.attrs.itemType === MapItemType.USER &&
      oldCoords.path.length > 0
    ) {
      throw new Error("Cannot displace a USER (root) item with a child item.");
    }

    // Step 1: Move target item to temporary position
    try {
      const tempCoords = await movementHelpers.moveItemToTemporaryLocation(
        targetItem,
        sourceParent,
        (item, coords, parent) =>
          movementHelpers.move(item, coords, parent, (parentId) =>
            queryHelpers.getDescendants(parentId),
          ),
      );
      return tempCoords;
    } catch (error) {
      console.error(`[MOVE STEP 1] Failed to move target item ${targetItem.id} to temporary position:`, error);
      throw error;
    }
  }


}
