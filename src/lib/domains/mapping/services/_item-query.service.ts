import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import type { Coord } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";

export class ItemQueryService {
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
   * Get all items for a specific map (root + descendants)
   */
  async getItems({
    userId,
    groupId = 0,
  }: {
    userId: number;
    groupId?: number;
  }): Promise<MapItemContract[]> {
    const rootItem = await this.actions.mapItems.getRootItem(userId, groupId);
    if (!rootItem) return [];
    const descendants = await this.actions.getDescendants(rootItem.id);
    const allItems = [rootItem, ...descendants];
    return allItems.map((item) => {
      const userId = item.attrs.coords.userId;
      return adapt.mapItem(item, userId);
    });
  }

  /**
   * Get all descendants of a specific item ID
   */
  async getDescendants({
    itemId,
  }: {
    itemId: number;
  }): Promise<MapItemContract[]> {
    const item = await this.actions.mapItems.getOne(itemId);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);

    const descendants = await this.actions.getDescendants(itemId);
    return descendants.map((desc) => {
      const userId = desc.attrs.coords.userId;
      return adapt.mapItem(desc, userId);
    });
  }

  /**
   * Get all ancestors of a specific item ID (path from root to item)
   */
  async getAncestors({
    itemId,
  }: {
    itemId: number;
  }): Promise<MapItemContract[]> {
    const item = await this.actions.mapItems.getOne(itemId);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);

    const ancestors = await this.actions.getAncestors(itemId);
    return ancestors.map((ancestor) => {
      const userId = ancestor.attrs.coords.userId;
      return adapt.mapItem(ancestor, userId);
    });
  }

  /**
   * Get a specific item by its ID
   */
  async getItemById({ itemId }: { itemId: number }): Promise<MapItemContract> {
    const item = await this.actions.mapItems.getOne(itemId);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);
    const userId = item.attrs.coords.userId;
    return adapt.mapItem(item, userId);
  }

  /**
   * Move an item to new coordinates
   */
  async moveMapItem({
    oldCoords,
    newCoords,
  }: {
    oldCoords: Coord;
    newCoords: Coord;
  }) {
    // Import TransactionManager at the top of the file
    const { TransactionManager } = await import("../infrastructure/transaction-manager");
    
    // Wrap the move operation in a transaction to ensure atomicity
    // This is critical for swap operations which involve multiple database updates
    const result = await TransactionManager.runInTransaction(async (tx) => {
      return await this.actions.moveMapItem({
        oldCoords,
        newCoords,
        tx, // Pass the transaction to the actions layer
      });
    });
    
    return {
      modifiedItems: result.modifiedItems.map(item => {
        const userId = item.attrs.coords.userId;
        return adapt.mapItem(item, userId);
      }),
      movedItemId: result.movedItemId,
      affectedCount: result.affectedCount,
    };
  }
}
