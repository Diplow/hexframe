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
  isBuiltInItemType,
} from "~/lib/domains/mapping/utils";
import { MapItemType, Visibility, type MapItemWithId, type ItemTypeValue } from "~/lib/domains/mapping/_objects";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";
import { TransactionManager } from "~/lib/domains/mapping/infrastructure";
import { type RequesterContext, SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

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
   * @param itemType - Required item type (cannot be USER)
   */
  async addItemToMap({
    parentId,
    coords,
    title,
    content,
    preview,
    link,
    visibility = Visibility.PRIVATE,
    itemType,
  }: {
    parentId: number | null;
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    visibility?: Visibility;
    itemType: ItemTypeValue;
  }): Promise<MapItemContract> {
    let parentItem = null;
    if (parentId !== null) {
      // Use SYSTEM_INTERNAL for internal operations - no visibility filtering
      parentItem = await this.mapItemRepository.getOne(parentId, SYSTEM_INTERNAL);
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

    // Validate itemType - USER type is system-controlled and cannot be set via API
    if (itemType === (MapItemType.USER as ItemTypeValue)) {
      throw new Error("Cannot set item type to USER - this is system-controlled.");
    }

    // Validate itemType hierarchy constraints for structural children
    if (parentItem && this._isStructuralChild(coords)) {
      this._validateItemTypeForCreation(parentItem.attrs.itemType, itemType);
    }

    const createParams = {
      itemType,
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
   * @param requester - The requester context for visibility filtering (required to prevent visibility bypass)
   */
  async getItem({
    coords,
    requester,
  }: {
    coords: Coord;
    requester: RequesterContext;
  }): Promise<MapItemContract> {
    const item = await this.mapItemRepository.getOneByIdr(
      { idr: { attrs: { coords } } },
      requester,
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
   * @param itemType - Optional new item type (cannot change to/from USER)
   * @param requester - The requester context for visibility filtering (required for visibility changes)
   */
  async updateItem({
    coords,
    title,
    content,
    preview,
    link,
    visibility,
    itemType,
    requester = SYSTEM_INTERNAL,
  }: {
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    visibility?: Visibility;
    itemType?: ItemTypeValue;
    requester?: RequesterContext;
  }): Promise<MapItemContract> {
    const item = await this.actions.getMapItem({ coords, requester });

    // Validate ownership for visibility changes
    if (visibility !== undefined) {
      // Only check ownership if requester is a user (not SYSTEM_INTERNAL)
      if (requester !== SYSTEM_INTERNAL && requester !== coords.userId) {
        throw new Error("Only the owner can change tile visibility.");
      }

      // Validate visibility inheritance: cannot set public if any ancestor is private
      if (visibility === Visibility.PUBLIC) {
        await this._validateVisibilityInheritance(coords, visibility);
      }

      // Update visibility on the map item
      await this.mapItemRepository.updateVisibility(item.id, visibility);
    }

    // Validate and update itemType
    if (itemType !== undefined) {
      // Cannot change to USER type - that's system-controlled
      if (itemType === (MapItemType.USER as ItemTypeValue)) {
        throw new Error("Cannot change item type to USER - this is system-controlled.");
      }
      // Cannot change FROM USER type - that's system-controlled
      if (item.attrs.itemType === (MapItemType.USER as ItemTypeValue)) {
        throw new Error("Cannot change item type of USER tiles - this is system-controlled.");
      }

      // Validate itemType hierarchy constraints
      await this._validateItemTypeForUpdate(coords, itemType);

      // For SYSTEM and CONTEXT types, cascade the update to all structural descendants
      if (itemType === (MapItemType.SYSTEM as ItemTypeValue) || itemType === (MapItemType.CONTEXT as ItemTypeValue)) {
        await this.mapItemRepository.batchUpdateItemTypeWithStructuralDescendants(coords, itemType);
      } else {
        // For ORGANIZATIONAL, just update this tile
        await this.mapItemRepository.updateItemType(item.id, itemType);
      }
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
    // Use SYSTEM_INTERNAL for fetching the updated item after update
    const updatedItem = await this.mapItemRepository.getOne(item.id, SYSTEM_INTERNAL);
    if (!updatedItem) {
      throw new Error(`Failed to retrieve updated item with ID ${item.id}`);
    }
    return adapt.mapItem(updatedItem, updatedItem.attrs.coords.userId);
  }

  /**
   * Update visibility of a tile and all its descendants in a single atomic operation.
   * This is more efficient than updating each tile individually.
   *
   * @param coords - Coordinates of the root tile
   * @param visibility - New visibility value
   * @param requester - The requester context for ownership validation
   * @returns Number of items updated
   */
  async updateVisibilityWithDescendants({
    coords,
    visibility,
    requester,
  }: {
    coords: Coord;
    visibility: Visibility;
    requester: RequesterContext;
  }): Promise<{ updatedCount: number }> {
    // Validate ownership - only the owner can change visibility
    if (requester !== SYSTEM_INTERNAL && requester !== coords.userId) {
      throw new Error("Only the owner can change tile visibility.");
    }

    // Validate visibility inheritance if setting to public
    if (visibility === Visibility.PUBLIC) {
      await this._validateVisibilityInheritance(coords, visibility);
    }

    // Perform the batch update
    const updatedCount = await this.mapItemRepository.batchUpdateVisibilityWithDescendants(
      coords,
      visibility,
    );

    return { updatedCount };
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
        // Use SYSTEM_INTERNAL to bypass visibility filtering for internal validation
        const parent = await this.mapItemRepository.getOneByIdr(
          { idr: { attrs: { coords: parentCoords } } },
          SYSTEM_INTERNAL,
        );
        ancestors.unshift(parent);
        currentCoords = parent.attrs.coords;
      } catch {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Check if a coordinate represents a structural child (positive direction 1-6).
   * Composition children (negative directions) and hexplans (direction 0) are not structural.
   */
  private _isStructuralChild(coords: Coord): boolean {
    if (coords.path.length === 0) return false;
    const lastDirection = coords.path[coords.path.length - 1];
    return lastDirection !== undefined && lastDirection > Direction.Center;
  }

  /**
   * Validate itemType hierarchy constraints when creating a new tile.
   *
   * Rules:
   * - SYSTEM tiles: structural children must also be SYSTEM
   * - CONTEXT tiles: structural children must also be CONTEXT
   * - ORGANIZATIONAL tiles: can only be children of USER or ORGANIZATIONAL
   * - USER tiles: can have any itemType as children
   * - Custom types (non-built-in): skip hierarchy validation
   */
  private _validateItemTypeForCreation(
    parentItemType: ItemTypeValue | null,
    childItemType: ItemTypeValue,
  ): void {
    if (!parentItemType) return;

    // Only validate hierarchy for built-in types
    // Custom types (e.g., "template") skip these constraints
    if (!isBuiltInItemType(parentItemType) || !isBuiltInItemType(childItemType)) {
      return;
    }

    // Rule: ORGANIZATIONAL tiles can only be under USER or ORGANIZATIONAL
    if (childItemType === MapItemType.ORGANIZATIONAL) {
      if (parentItemType !== MapItemType.USER && parentItemType !== MapItemType.ORGANIZATIONAL) {
        throw new Error(
          "ORGANIZATIONAL tiles can only be created under USER or ORGANIZATIONAL parents. " +
          `Cannot create ORGANIZATIONAL tile under ${parentItemType} parent.`
        );
      }
    }

    switch (parentItemType) {
      case MapItemType.SYSTEM:
        if (childItemType !== MapItemType.SYSTEM) {
          throw new Error(
            "Structural children of SYSTEM tiles must also be SYSTEM tiles. " +
            "Use composition children (negative directions) for context materials."
          );
        }
        break;

      case MapItemType.CONTEXT:
        if (childItemType !== MapItemType.CONTEXT) {
          throw new Error(
            "Structural children of CONTEXT tiles must also be CONTEXT tiles. " +
            "Use composition children (negative directions) for supporting materials."
          );
        }
        break;

      case MapItemType.ORGANIZATIONAL:
        // ORGANIZATIONAL tiles can have any non-USER children
        // (ORGANIZATIONAL constraint is checked above)
        break;

      case MapItemType.USER:
        // USER tiles (root) can have any itemType as children
        break;
    }
  }

  /**
   * Validate itemType hierarchy constraints when updating an existing tile.
   *
   * Checks that the parent tile's itemType allows the new itemType.
   * For ORGANIZATIONAL: can only be under USER or ORGANIZATIONAL parents.
   */
  private async _validateItemTypeForUpdate(
    coords: Coord,
    newItemType: ItemTypeValue,
  ): Promise<void> {
    // Get the parent to check constraints
    const parentCoords = CoordSystem.getParentCoord(coords);
    if (!parentCoords) return; // Root tile, no parent constraints

    // Only validate for structural children (positive directions)
    if (!this._isStructuralChild(coords)) return;

    let parent;
    try {
      parent = await this.mapItemRepository.getOneByIdr(
        { idr: { attrs: { coords: parentCoords } } },
        SYSTEM_INTERNAL,
      );
    } catch {
      // Parent not found, skip validation
      return;
    }

    const parentItemType = parent.attrs.itemType;

    // Rule: ORGANIZATIONAL tiles can only be under USER or ORGANIZATIONAL
    if (newItemType === (MapItemType.ORGANIZATIONAL as ItemTypeValue)) {
      if (parentItemType !== (MapItemType.USER as ItemTypeValue) && parentItemType !== (MapItemType.ORGANIZATIONAL as ItemTypeValue)) {
        throw new Error(
          "Cannot change to ORGANIZATIONAL: parent must be USER or ORGANIZATIONAL. " +
          `Current parent is ${parentItemType}.`
        );
      }
    }

    // Check constraints based on parent's itemType (only for built-in types)
    switch (parentItemType as MapItemType) {
      case MapItemType.SYSTEM:
        if (newItemType !== (MapItemType.SYSTEM as ItemTypeValue)) {
          throw new Error(
            "Cannot change itemType: tile is a structural child of a SYSTEM tile. " +
            "Structural descendants of SYSTEM tiles must remain SYSTEM."
          );
        }
        break;

      case MapItemType.CONTEXT:
        if (newItemType !== (MapItemType.CONTEXT as ItemTypeValue)) {
          throw new Error(
            "Cannot change itemType: tile is a structural child of a CONTEXT tile. " +
            "Structural descendants of CONTEXT tiles must remain CONTEXT."
          );
        }
        break;

      case MapItemType.ORGANIZATIONAL:
        // ORGANIZATIONAL tiles can have any non-USER children
        // (ORGANIZATIONAL constraint is checked above)
        // Allow changing to SYSTEM or CONTEXT - will cascade to descendants
        break;

      case MapItemType.USER:
        // USER root can have any itemType children
        break;
    }
  }
}
