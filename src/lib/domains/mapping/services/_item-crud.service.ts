import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import {
  type Coord,
  CoordSystem,
} from "~/lib/domains/mapping/utils";
import { MapItemType } from "~/lib/domains/mapping/_objects";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";
import { TransactionManager } from "~/lib/domains/mapping/infrastructure";

export class ItemCrudService {
  private readonly actions: MapItemActions;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.actions = new MapItemActions({
      mapItem: repositories.mapItem,
      baseItem: repositories.baseItem,
    });
  }

  /**
   * Adds a child (BASE type) MapItem to an existing parent MapItem within a tree.
   */
  async addItemToMap({
    parentId,
    coords,
    title,
    descr,
    url,
  }: {
    parentId: number | null;
    coords: Coord;
    title?: string;
    descr?: string;
    url?: string;
  }): Promise<MapItemContract> {
    let parentItem = null;
    if (parentId !== null) {
      parentItem = await this.actions.mapItems.getOne(parentId);
      if (!parentItem) {
        throw new Error(`Parent MapItem with ID ${parentId} not found.`);
      }

      if (
        coords.userId !== parentItem.attrs.coords.userId ||
        coords.groupId !== parentItem.attrs.coords.groupId
      ) {
        throw new Error("New item's userId/groupId must match parent's.");
      }
      const expectedParentPath =
        CoordSystem.getParentCoord(coords)?.path.join(",");
      const actualParentPath = parentItem.attrs.coords.path.join(",");
      if (
        coords.path.length !== parentItem.attrs.coords.path.length + 1 ||
        actualParentPath !== expectedParentPath
      ) {
        throw new Error(
          "New item's coordinates are not a direct child of the parent.",
        );
      }
    }

    const newItem = await this.actions.createMapItem({
      itemType: MapItemType.BASE,
      coords,
      title,
      descr,
      url,
      parentId: parentItem?.id,
    });
    return adapt.mapItem(newItem, newItem.attrs.coords.userId);
  }

  /**
   * Get a specific item by its coordinates
   */
  async getItem({ coords }: { coords: Coord }): Promise<MapItemContract> {
    const item = await this.actions.getMapItem({ coords });
    return adapt.mapItem(item, item.attrs.coords.userId);
  }

  /**
   * Update attributes (like BaseItem ref) of an existing item
   */
  async updateItem({
    coords,
    title,
    descr,
    url,
  }: {
    coords: Coord;
    title?: string;
    descr?: string;
    url?: string;
  }): Promise<MapItemContract> {
    const item = await this.actions.getMapItem({ coords });

    if (title !== undefined || descr !== undefined || url !== undefined) {
      await this.actions.updateRef(item.ref, {
        title,
        descr,
        link: url,
      });
    }
    const updatedItem = await this.actions.mapItems.getOne(item.id);
    if (!updatedItem) {
      throw new Error(`Failed to retrieve updated item with ID ${item.id}`);
    }
    return adapt.mapItem(updatedItem, updatedItem.attrs.coords.userId);
  }

  /**
   * Remove a specific item (and its descendants)
   */
  async removeItem({ coords }: { coords: Coord }): Promise<void> {
    const itemToRemove = await this.actions.getMapItem({ coords });
    await this.actions.removeItem({ idr: { id: itemToRemove.id } });
  }

  /**
   * Move a map item to a new position with transaction support
   * This ensures all operations are atomic - either all succeed or all fail
   */
  async moveMapItem({
    oldCoords,
    newCoords,
  }: {
    oldCoords: Coord;
    newCoords: Coord;
  }): Promise<{
    modifiedItems: MapItemContract[];
    movedItemId: number;
    affectedCount: number;
  }> {
    // Wrap the operation in a transaction
    return await TransactionManager.runInTransaction(async (tx) => {
      const result = await this.actions.moveMapItem({
        oldCoords,
        newCoords,
        tx, // Pass the transaction to the action
      });
      
      // Convert to contracts
      return {
        ...result,
        modifiedItems: result.modifiedItems.map(item => 
          adapt.mapItem(item, item.attrs.coords.userId)
        ),
      };
    });
  }
}
