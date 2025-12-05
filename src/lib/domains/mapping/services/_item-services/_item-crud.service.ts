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
import { MapItemType, Visibility, type MapItemWithId } from "~/lib/domains/mapping/_objects";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";
import { TransactionManager } from "~/lib/domains/mapping/infrastructure";

export class ItemCrudService {
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
   * Adds a child (BASE type) MapItem to an existing parent MapItem within a tree.
   *
   * @param parentId - ID of the parent item (null for root)
   * @param coords - Coordinates for the new item
   * @param title - Optional title
   * @param content - Optional content
   * @param preview - Optional preview text
   * @param link - Optional URL
   * @param visibility - Visibility setting (defaults to "private")
   */
  async addItemToMap({
    parentId,
    coords,
    title,
    content,
    preview,
    link,
    visibility = Visibility.PRIVATE,
  }: {
    parentId: number | null;
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    visibility?: Visibility;
  }): Promise<MapItemContract> {
    let parentItem = null;
    if (parentId !== null) {
      parentItem = await this.mapItemRepository.getOne(parentId);
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

    // Validate visibility inheritance: cannot create public tile under private ancestor
    if (visibility === Visibility.PUBLIC && parentItem) {
      await this._validateVisibilityInheritance(coords, visibility);
    }

    const createParams = {
      itemType: MapItemType.BASE,
      coords,
      title,
      content,
      preview,
      link,
      parentId: parentItem?.id,
      visibility,
    };

    const newItem = await this.actions.createMapItem(createParams);
    return adapt.mapItem(newItem, newItem.attrs.coords.userId);
  }

  /**
   * Get a specific item by its coordinates
   * @param coords - Coordinates of the item
   * @param requesterUserId - The user making the request (for visibility filtering)
   */
  async getItem({
    coords,
    requesterUserId,
  }: {
    coords: Coord;
    requesterUserId?: string;
  }): Promise<MapItemContract> {
    const item = await this.mapItemRepository.getOneByIdr(
      { idr: { attrs: { coords } } },
      requesterUserId,
    );
    return adapt.mapItem(item, item.attrs.coords.userId);
  }

  /**
   * Update attributes (like BaseItem ref) of an existing item
   *
   * @param coords - Coordinates of the item to update
   * @param title - Optional new title
   * @param content - Optional new content
   * @param preview - Optional new preview
   * @param link - Optional new link
   * @param visibility - Optional new visibility setting
   * @param requesterUserId - The user making the request (required for visibility changes)
   */
  async updateItem({
    coords,
    title,
    content,
    preview,
    link,
    visibility,
    requesterUserId,
  }: {
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    visibility?: Visibility;
    requesterUserId?: string;
  }): Promise<MapItemContract> {
    const item = await this.actions.getMapItem({ coords, requesterUserId });

    // Validate ownership for visibility changes
    if (visibility !== undefined) {
      if (requesterUserId && requesterUserId !== coords.userId) {
        throw new Error("Only the owner can change tile visibility.");
      }

      // Validate visibility inheritance: cannot set public if any ancestor is private
      if (visibility === Visibility.PUBLIC) {
        await this._validateVisibilityInheritance(coords, visibility);
      }

      // Update visibility on the map item
      await this.mapItemRepository.updateVisibility(item.id, visibility);
    }

    if (title !== undefined || content !== undefined || preview !== undefined || link !== undefined) {
      const updateAttrs = {
        title,
        content,
        preview,
        link,
      };
      await this.actions.updateRef(item.ref, updateAttrs);
    }
    const updatedItem = await this.mapItemRepository.getOne(item.id);
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
   * Remove children by direction type (structural, composed, or hexPlan).
   * This removes direct children and all their descendants.
   *
   * @param coords - Parent tile coordinates
   * @param directionType - Type of children to remove:
   *   - 'structural': positive directions (1-6)
   *   - 'composed': negative directions (-1 to -6)
   *   - 'hexPlan': direction 0 only
   */
  async removeChildrenByType({
    coords,
    directionType,
  }: {
    coords: Coord;
    directionType: 'structural' | 'composed' | 'hexPlan';
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
   * For 'hexPlan': filters ALL tiles that have direction 0 anywhere in their
   * path after the parent (recursively deletes all hexplans in the subtree).
   */
  private _filterDescendantsByDirectionType(
    descendants: Awaited<ReturnType<typeof this.actions.getDescendants>>,
    parentCoords: Coord,
    directionType: 'structural' | 'composed' | 'hexPlan',
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
        case 'hexPlan':
          {
          // Delete ALL hexPlan tiles in the subtree
          // This includes any tile that has direction 0 anywhere in its path after parent
          const pathAfterParent = itemPath.slice(parentPathLength);
          return pathAfterParent.includes(Direction.Center);
          }
        default:
          return false;
      }
    });
  }

  /**
   * Validates that a tile can be set to public by checking all ancestors.
   * A tile cannot be public if any ancestor is private (restrictive inheritance).
   *
   * Uses unfiltered ancestor fetch to ensure all ancestors are checked regardless
   * of requester visibility permissions.
   *
   * @throws Error if any ancestor is private and visibility is PUBLIC
   */
  private async _validateVisibilityInheritance(
    coords: Coord,
    visibility: Visibility,
  ): Promise<void> {
    // Only validate for public visibility
    if (visibility !== Visibility.PUBLIC) {
      return;
    }

    // Get all ancestors WITHOUT visibility filtering (undefined requesterUserId)
    // This ensures we check all ancestors regardless of their visibility
    const ancestors = await this._getAncestorsUnfiltered(coords);

    // Check if any ancestor is private
    const privateAncestor = ancestors.find(
      (ancestor) => ancestor.attrs.visibility === Visibility.PRIVATE
    );

    if (privateAncestor) {
      throw new Error(
        "Cannot set tile to public: one or more ancestors are private. " +
        "Make the ancestor tiles public first."
      );
    }
  }

  /**
   * Get all ancestors without visibility filtering.
   * Used for internal validation where we need to see all ancestors.
   */
  private async _getAncestorsUnfiltered(
    coords: Coord
  ): Promise<MapItemWithId[]> {
    const ancestors: MapItemWithId[] = [];
    let currentCoords = coords;

    while (!CoordSystem.isCenter(currentCoords)) {
      const parentCoords = CoordSystem.getParentCoord(currentCoords);
      if (!parentCoords) break;

      try {
        // Use undefined requesterUserId to bypass visibility filtering
        const parent = await this.mapItemRepository.getOneByIdr(
          { idr: { attrs: { coords: parentCoords } } },
          undefined, // Bypass visibility filtering for internal validation
        );
        ancestors.unshift(parent);
        currentCoords = parent.attrs.coords;
      } catch {
        break;
      }
    }

    return ancestors;
  }
}
