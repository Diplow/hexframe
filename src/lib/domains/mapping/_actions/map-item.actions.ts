import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import type {
  BaseItemAttrs,
  BaseItemWithId,
  MapItemWithId,
  MapItemType,
} from "~/lib/domains/mapping/_objects";
import type { Coord } from "~/lib/domains/mapping/utils";
import type { MapItemIdr } from "~/lib/domains/mapping/_repositories/map-item";
import { MapItemCreationHelpers } from "~/lib/domains/mapping/_actions/_map-item-creation-helpers";
import { MapItemQueryHelpers } from "~/lib/domains/mapping/_actions/_map-item-query-helpers";
import { MapItemMovementHelpers } from "~/lib/domains/mapping/_actions/_map-item-movement-helpers";
import { MapItemActionHelpers } from "~/lib/domains/mapping/_actions/map-item-action-helpers";
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

  public async createMapItem(params: any): Promise<MapItemWithId> {
    const { itemType, coords, title, descr, preview, url, parentId } = params;
    console.log("[PREVIEW DEBUG] Actions createMapItem received preview:", preview);
    const createParams = {
      itemType,
      coords,
      title,
      descr,
      preview,
      url,
      parentId,
    };
    return await this.creationHelpers.createMapItem(createParams);
  }

  public async updateRef(ref: BaseItemWithId, attrs: Partial<BaseItemAttrs>) {
    return await this.creationHelpers.updateRef(ref, attrs);
  }

  public async removeItem({ idr }: { idr: MapItemIdr }) {
    const { item, descendants } = await MapItemActionHelpers.getItemAndDescendants(
      idr,
      this.mapItems,
      (parentId) => this.getDescendants(parentId)
    );
    await MapItemActionHelpers.removeDescendantsAndItem(descendants, item.id, this.mapItems);
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
    MapItemActionHelpers.validateUserItemMove(sourceItem, newCoords);
    MapItemActionHelpers.validateUserSpaceMove(sourceItem, newCoords);

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
      
      
    const tempCoordsHoldingTarget = await MapItemActionHelpers.handleTargetItemDisplacement(
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
}
