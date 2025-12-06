import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import { CoordSystem, Direction, type Coord } from "~/lib/domains/mapping/utils";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";
import type { MapItemWithId } from "~/lib/domains/mapping/_objects";
import { type RequesterContext, SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

export class ItemQueryService {
  private readonly actions: MapItemActions;
  private readonly mapItemRepository: MapItemRepository;

  constructor(repositories: {
    mapItem: MapItemRepository;
    baseItem: BaseItemRepository;
  }) {
    this.actions = new MapItemActions({
      mapItem: repositories.mapItem,
      baseItem: repositories.baseItem,
    });
    this.mapItemRepository = repositories.mapItem;
  }

  /**
   * Get all items for a specific map (root + descendants)
   * @param userId - Owner of the map
   * @param groupId - Group ID (default 0)
   * @param requester - The requester context for visibility filtering
   */
  async getItems({
    userId,
    groupId = 0,
    requester = SYSTEM_INTERNAL,
  }: {
    userId: string;
    groupId?: number;
    requester?: RequesterContext;
  }): Promise<MapItemContract[]> {
    const rootItem = await this.mapItemRepository.getRootItem(userId, groupId, requester);
    if (!rootItem) return [];
    const descendants = await this.mapItemRepository.getDescendantsByParent({
      parentUserId: rootItem.attrs.coords.userId,
      parentGroupId: rootItem.attrs.coords.groupId,
      parentPath: rootItem.attrs.coords.path,
      requester,
    });
    const allItems = [rootItem, ...descendants];
    return allItems.map((item) => {
      const itemUserId = item.attrs.coords.userId;
      return adapt.mapItem(item, itemUserId);
    });
  }

  /**
   * Check if a tile has composition (children with negative directions)
   * @param coordId - Coordinate ID of the parent tile
   * @param requester - The requester context for visibility filtering
   */
  async hasComposition({
    coordId,
    requester = SYSTEM_INTERNAL,
  }: {
    coordId: string;
    requester?: RequesterContext;
  }): Promise<boolean> {
    // Parse parent coord
    const parentCoord = CoordSystem.parseId(coordId);

    // Get composed children (negative directions)
    const composedChildCoords = CoordSystem.getComposedChildCoords(parentCoord);

    // Check if any composed child exists
    for (const childCoord of composedChildCoords) {
      try {
        await this.mapItemRepository.getOneByIdr(
          { idr: { attrs: { coords: childCoord } } },
          requester,
        );
        return true; // Found at least one composed child
      } catch {
        // This composed child doesn't exist, continue checking
      }
    }

    return false; // No composed children found
  }

  /**
   * Get composed children for a tile (direction 0 + children with negative directions)
   * @param coordId - Coordinate ID of the parent tile
   * @param requester - The requester context for visibility filtering
   */
  async getComposedChildren({
    coordId,
    requester = SYSTEM_INTERNAL,
  }: {
    coordId: string;
    requester?: RequesterContext;
  }): Promise<MapItemContract[]> {
    // Parse parent coord
    const parentCoord = CoordSystem.parseId(coordId);

    // Get all possible composed child coordinates (direction 0 + negative directions)
    const composedChildCoords = CoordSystem.getComposedChildCoords(parentCoord);

    // Also include direction 0 (orchestration tile)
    const direction0Coord: Coord = {
      ...parentCoord,
      path: [...parentCoord.path, Direction.Center],
    };

    // Fetch existing composed children
    const composedChildren: MapItemContract[] = [];

    // Try to fetch direction 0 first
    try {
      const direction0Child = await this.mapItemRepository.getOneByIdr(
        { idr: { attrs: { coords: direction0Coord } } },
        requester,
      );

      const direction0Contract = adapt.mapItem(
        direction0Child,
        direction0Child.attrs.coords.userId
      );

      composedChildren.push(direction0Contract);
    } catch {
      // Direction 0 doesn't exist, skip it
    }

    // Then fetch negative direction children
    for (const childCoord of composedChildCoords) {
      try {
        const child = await this.mapItemRepository.getOneByIdr(
          { idr: { attrs: { coords: childCoord } } },
          requester,
        );

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
   * @param itemId - ID of the parent item
   * @param includeComposition - Whether to include composed children
   * @param requester - The requester context for visibility filtering
   */
  async getDescendants({
    itemId,
    includeComposition = true,
    requester = SYSTEM_INTERNAL,
  }: {
    itemId: number;
    includeComposition?: boolean;
    requester?: RequesterContext;
  }): Promise<MapItemContract[]> {
    const item = await this.mapItemRepository.getOne(itemId, requester);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);

    // Get descendants with visibility filtering
    let descendants = await this.mapItemRepository.getDescendantsByParent({
      parentUserId: item.attrs.coords.userId,
      parentGroupId: item.attrs.coords.groupId,
      parentPath: item.attrs.coords.path,
      requester,
    });

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
      const descUserId = desc.attrs.coords.userId;
      return adapt.mapItem(desc, descUserId);
    });
  }

  /**
   * Get all ancestors of a specific item ID (path from root to item)
   * @param itemId - ID of the item
   * @param requester - The requester context for visibility filtering
   *
   * Note: For visibility inheritance validation, use SYSTEM_INTERNAL
   * to get all ancestors regardless of visibility.
   */
  async getAncestors({
    itemId,
    requester = SYSTEM_INTERNAL,
  }: {
    itemId: number;
    requester?: RequesterContext;
  }): Promise<MapItemContract[]> {
    const item = await this.mapItemRepository.getOne(itemId, requester);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);

    const ancestors = await this._getAncestorsInternal(item.attrs.coords, requester);
    return ancestors.map((ancestor) => {
      const ancestorUserId = ancestor.attrs.coords.userId;
      return adapt.mapItem(ancestor, ancestorUserId);
    });
  }

  /**
   * Internal method to get ancestors by walking up the coordinate tree
   * This is used for both public API and internal visibility validation
   */
  private async _getAncestorsInternal(
    coords: Coord,
    requester: RequesterContext = SYSTEM_INTERNAL
  ): Promise<MapItemWithId[]> {
    const ancestors: MapItemWithId[] = [];
    let currentCoords = coords;

    while (!CoordSystem.isCenter(currentCoords)) {
      const parentCoords = CoordSystem.getParentCoord(currentCoords);
      if (!parentCoords) break;

      try {
        const parent = await this.mapItemRepository.getOneByIdr(
          { idr: { attrs: { coords: parentCoords } } },
          requester,
        );
        ancestors.unshift(parent); // Add to beginning to maintain root->item order
        currentCoords = parent.attrs.coords;
      } catch {
        // Parent not found, stop traversing
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get a specific item by its ID
   * @param itemId - ID of the item
   * @param requester - The requester context for visibility filtering
   */
  async getItemById({
    itemId,
    requester = SYSTEM_INTERNAL,
  }: {
    itemId: number;
    requester?: RequesterContext;
  }): Promise<MapItemContract> {
    const item = await this.mapItemRepository.getOne(itemId, requester);
    if (!item) throw new Error(`Item with id ${itemId} not found.`);
    const itemUserId = item.attrs.coords.userId;
    return adapt.mapItem(item, itemUserId);
  }

  /**
   * Get an item by coordinates
   * @param coords - Coordinates of the item
   * @param requester - The requester context for visibility filtering
   */
  async getItemByCoords({
    coords,
    requester = SYSTEM_INTERNAL,
  }: {
    coords: Coord;
    requester?: RequesterContext;
  }): Promise<MapItemContract> {
    const item = await this.mapItemRepository.getOneByIdr(
      { idr: { attrs: { coords } } },
      requester,
    );
    const itemUserId = item.attrs.coords.userId;
    return adapt.mapItem(item, itemUserId);
  }

  /**
   * Get an item with a limited number of descendant generations
   * @param coords - Coordinates of the center item
   * @param generations - Number of generations to fetch
   * @param requester - The requester context for visibility filtering
   */
  async getItemWithGenerations({
    coords,
    generations = 0,
    requester = SYSTEM_INTERNAL,
  }: {
    coords: Coord;
    generations?: number;
    requester?: RequesterContext;
  }): Promise<MapItemContract[]> {
    // Get the center item
    const centerItem = await this.mapItemRepository.getOneByIdr(
      { idr: { attrs: { coords } } },
      requester,
    );
    if (!centerItem) throw new Error(`Item at coordinates not found.`);
    const centerUserId = centerItem.attrs.coords.userId;
    const centerContract = adapt.mapItem(centerItem, centerUserId);

    // If no generations requested, return just the center item
    if (generations <= 0) {
      return [centerContract];
    }

    // Get the descendants with depth limit
    const descendants = await this.mapItemRepository.getDescendantsWithDepth({
      parentPath: coords.path,
      parentUserId: coords.userId,
      parentGroupId: coords.groupId,
      maxGenerations: generations,
      requester,
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
