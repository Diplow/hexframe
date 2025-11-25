import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import {
  type Coord,
  CoordSystem,
  Direction,
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
    content,
    preview,
    link,
  }: {
    parentId: number | null;
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
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

      // Check if this is a direct child (structural or composed)
      // Direct children have path length = parent + 1
      const isDirectChild =
        coords.path.length === parentItem.attrs.coords.path.length + 1 &&
        actualParentPath === expectedParentPath;

      if (!isDirectChild) {
        throw new Error(
          "New item's coordinates are not a direct child of the parent.",
        );
      }
    }

    const createParams = {
      itemType: MapItemType.BASE,
      coords,
      title,
      content,
      preview,
      link,
      parentId: parentItem?.id,
    };

    const newItem = await this.actions.createMapItem(createParams);
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
    content,
    preview,
    link,
  }: {
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
  }): Promise<MapItemContract> {
    const item = await this.actions.getMapItem({ coords });

    if (title !== undefined || content !== undefined || preview !== undefined || link !== undefined) {
      const updateAttrs = {
        title,
        content,
        preview,
        link,
      };
      await this.actions.updateRef(item.ref, updateAttrs);
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

  /**
   * Remove children by direction type (structural, composed, or execution history).
   * This removes direct children and all their descendants.
   *
   * @param coords - Parent tile coordinates
   * @param directionType - Type of children to remove:
   *   - 'structural': positive directions (1-6)
   *   - 'composed': negative directions (-1 to -6)
   *   - 'executionHistory': direction 0 only
   */
  async removeChildrenByType({
    coords,
    directionType,
  }: {
    coords: Coord;
    directionType: 'structural' | 'composed' | 'executionHistory';
  }): Promise<{ deletedCount: number }> {
    const parentItem = await this.actions.getMapItem({ coords });
    const descendants = await this.actions.getDescendants(parentItem.id);

    const itemsToDelete = this._filterDescendantsByDirectionType(
      descendants,
      coords,
      directionType,
    );

    // Delete in reverse order (deepest first) to avoid foreign key issues
    for (const item of itemsToDelete.reverse()) {
      await this.actions.mapItems.remove(item.id);
    }

    return { deletedCount: itemsToDelete.length };
  }

  /**
   * Filters descendants based on direction type relative to the parent.
   *
   * For 'structural' and 'composed': filters by the first child direction after parent.
   * For 'executionHistory': filters ALL tiles that have direction 0 anywhere in their
   * path after the parent (recursively deletes all execution histories in the subtree).
   */
  private _filterDescendantsByDirectionType(
    descendants: Awaited<ReturnType<typeof this.actions.getDescendants>>,
    parentCoords: Coord,
    directionType: 'structural' | 'composed' | 'executionHistory',
  ) {
    const parentPathLength = parentCoords.path.length;

    return descendants.filter((item) => {
      const itemPath = item.attrs.coords.path;
      if (itemPath.length <= parentPathLength) return false;

      // Get the first direction after the parent's path (the direct child direction)
      const firstChildDirection = itemPath[parentPathLength];
      if (firstChildDirection === undefined) return false;

      switch (directionType) {
        case 'structural':
          // Positive directions: 1-6
          return firstChildDirection > Direction.Center;
        case 'composed':
          // Negative directions: -1 to -6
          return firstChildDirection < Direction.Center;
        case 'executionHistory':
          {
          // Delete ALL execution history tiles in the subtree
          // This includes any tile that has direction 0 anywhere in its path after parent
          const pathAfterParent = itemPath.slice(parentPathLength);
          return pathAfterParent.includes(Direction.Center);
          }
        default:
          return false;
      }
    });
  }
}
