import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import { CoordSystem, type Coord } from "~/lib/domains/mapping/utils";
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
   * Check if a tile has composition (children with negative directions)
   */
  async hasComposition({
    coordId,
  }: {
    coordId: string;
  }): Promise<boolean> {
    // Parse parent coord
    const parentCoord = CoordSystem.parseId(coordId);

    // Get composed children (negative directions)
    const composedChildCoords = CoordSystem.getComposedChildCoords(parentCoord);

    // Check if any composed child exists
    for (const childCoord of composedChildCoords) {
      try {
        await this.actions.getMapItem({
          coords: childCoord,
        });
        return true; // Found at least one composed child
      } catch {
        // This composed child doesn't exist, continue checking
      }
    }

    return false; // No composed children found
  }

  /**
   * Get composed children for a tile (children with negative directions)
   */
  async getComposedChildren({
    coordId,
  }: {
    coordId: string;
  }): Promise<MapItemContract[]> {
    // Parse parent coord
    const parentCoord = CoordSystem.parseId(coordId);

    // Get all possible composed child coordinates (negative directions)
    const composedChildCoords = CoordSystem.getComposedChildCoords(parentCoord);

    // Fetch existing composed children
    const composedChildren: MapItemContract[] = [];

    for (const childCoord of composedChildCoords) {
      try {
        const child = await this.actions.getMapItem({
          coords: childCoord,
        });

        const childContract = adapt.mapItem(
          child,
          child.attrs.coords.userId
        );

        composedChildren.push(childContract);
      } catch {
        // This composed child doesn't exist, skip it
      }
    }

    return composedChildren;
  }

  /**
   * Get all descendants of a specific item ID
   */
  async getDescendants({
    itemId,
    includeComposition = false,
  }: {
    itemId: number;
    includeComposition?: boolean;
  }): Promise<MapItemContract[]> {
    const item = await this.actions.mapItems.getOne(itemId);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);

    // Get descendants
    let descendants = await this.actions.getDescendants(itemId);

    // Filter out composition if not requested
    if (!includeComposition) {
      descendants = descendants.filter((desc) => {
        // Remove items that are composed children:
        // - New model: negative directions in path
        // - Legacy model: Direction.Center (0) in path
        const path = desc.attrs.coords.path;
        const hasNegativeDirection = path.some((dir) => (dir as number) < 0);
        const hasCenter = path.some((dir) => (dir as number) === 0);
        return !hasNegativeDirection && !hasCenter;
      });
    }

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
   * Get an item by coordinates
   */
  async getItemByCoords({ coords }: { coords: Coord }): Promise<MapItemContract> {
    const item = await this.actions.getMapItem({ coords });
    const userId = item.attrs.coords.userId;
    return adapt.mapItem(item, userId);
  }

  /**
   * Get an item with a limited number of descendant generations
   */
  async getItemWithGenerations({
    coords,
    generations = 0,
  }: {
    coords: Coord;
    generations?: number;
  }): Promise<MapItemContract[]> {
    // Get the center item
    const centerItem = await this.actions.getMapItem({ coords });
    if (!centerItem) throw new Error(`Item at coordinates not found.`);
    const userId = centerItem.attrs.coords.userId;
    const centerContract = adapt.mapItem(centerItem, userId);

    // If no generations requested, return just the center item
    if (generations <= 0) {
      return [centerContract];
    }

    // Get the descendants with depth limit
    const descendants = await this.actions.mapItems.getDescendantsWithDepth({
      parentPath: coords.path,
      parentUserId: coords.userId,
      parentGroupId: coords.groupId,
      maxGenerations: generations,
    });

    // Convert to contracts
    const descendantContracts = descendants.map((desc) => {
      const descUserId = desc.attrs.coords.userId;
      return adapt.mapItem(desc, descUserId);
    });

    return [centerContract, ...descendantContracts];
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
    const { TransactionManager } = await import("~/lib/domains/mapping/infrastructure/transaction-manager");
    
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
