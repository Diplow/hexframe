import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt, type MapItemContract } from "~/lib/domains/mapping/types/contracts";
import {
  CoordSystem,
  type ContextStrategy,
  type MapContext,
} from "~/lib/domains/mapping/utils";
import { type RequesterContext, SYSTEM_INTERNAL } from "~/lib/domains/mapping/types";

/**
 * Context data optimized for hexecute prompt building.
 * Contains all data needed by buildPrompt() in one efficient query.
 */
export interface HexecuteContext {
  /** The task tile with title (goal) and content (requirements) */
  task: MapItemContract;
  /** Ancestors from root to parent (top-down context flow) */
  ancestors: Array<{
    title: string;
    content: string | undefined;
    coords: string;
  }>;
  /** Composed children (-1 to -6): context materials, constraints, templates */
  composedChildren: MapItemContract[];
  /** Structural children (1-6): subtasks with title, preview, and coords */
  structuralChildren: Array<{
    title: string;
    preview: string | undefined;
    coords: string;
  }>;
  /** HexPlan content from direction-0 tile, if it exists */
  hexPlan: string | undefined;
  /** All leaf tasks (tiles without structural children) for root hexplan generation */
  allLeafTasks: Array<{
    title: string;
    coords: string;
  }> | undefined;
}

/**
 * Service for fetching map context for AI operations
 *
 * Fetches tiles around a center tile based on strategy:
 * - Parent: The tile containing the center
 * - Composed: Direction 0 (internal structure) tiles
 * - Children: Direct descendants (depth 1)
 * - Grandchildren: Second-level descendants (depth 2)
 */
export class ItemContextService {
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
   * Get context around a center tile
   *
   * Uses optimized single-query approach that:
   * - Fetches all needed tiles in one database query
   * - Excludes direction 0 paths from children/grandchildren
   * - Avoids redundant data fetching
   *
   * @param centerCoordId - Coordinate ID of the center tile
   * @param strategy - Which surrounding tiles to include
   * @param requester - The requester context for visibility filtering
   * @returns MapContext with center and surrounding tiles
   */
  async getContextForCenter(
    centerCoordId: string,
    strategy: ContextStrategy,
    requester: RequesterContext = SYSTEM_INTERNAL
  ): Promise<MapContext> {
    // Parse center coordinates
    const centerCoord = CoordSystem.parseId(centerCoordId);
    const userId = centerCoord.userId;

    // Use optimized repository method - single query with pattern matching
    const contextData = await this.mapItemRepository.getContextForCenter({
      centerPath: centerCoord.path,
      userId: centerCoord.userId,
      groupId: centerCoord.groupId,
      includeParent: strategy.includeParent,
      includeComposed: strategy.includeComposed,
      includeChildren: strategy.includeChildren,
      includeGrandchildren: strategy.includeGrandchildren,
      requester,
    });

    // Convert to contracts
    return {
      center: adapt.mapItem(contextData.center, userId),
      parent: contextData.parent ? adapt.mapItem(contextData.parent, userId) : null,
      composed: contextData.composed.map((item) => adapt.mapItem(item, userId)),
      children: contextData.children.map((item) => adapt.mapItem(item, userId)),
      grandchildren: contextData.grandchildren.map((item) => adapt.mapItem(item, userId)),
    };
  }

  /**
   * Get context optimized for hexecute prompt building.
   *
   * Fetches all data needed by buildPrompt() in a single optimized query:
   * - Task tile (center) with title and content
   * - Ancestors (for top-down context flow)
   * - Composed children (-1 to -6) for context materials
   * - Structural children (1-6) for subtasks (with coords for recursive execution)
   * - HexPlan content from direction-0
   * - All leaf tasks (for root hexplan generation)
   *
   * @param centerCoordId - Coordinate ID of the task tile
   * @param requester - The requester context for visibility filtering
   * @returns HexecuteContext ready for buildPrompt()
   */
  async getHexecuteContext(
    centerCoordId: string,
    requester: RequesterContext = SYSTEM_INTERNAL
  ): Promise<HexecuteContext> {
    // Parse center coordinates
    const centerCoord = CoordSystem.parseId(centerCoordId);
    const userId = centerCoord.userId;

    // Use optimized repository method - fetches all needed data including hexPlan
    const contextData = await this.mapItemRepository.getContextForCenter({
      centerPath: centerCoord.path,
      userId: centerCoord.userId,
      groupId: centerCoord.groupId,
      includeParent: false,           // Not needed for hexecute
      includeComposed: true,          // Needed: composed children + hexPlan
      includeChildren: true,          // Needed: structural children for subtasks
      includeGrandchildren: false,    // Not needed for hexecute
      requester,
    });

    // Convert task (center) to contract
    const task = adapt.mapItem(contextData.center, userId);

    // Fetch ancestors for top-down context flow
    const ancestors = await this._fetchAncestors(centerCoord, userId, requester);

    // Convert composed children to contracts
    const composedChildren = contextData.composed.map((item) => adapt.mapItem(item, userId));

    // Map structural children to the format buildPrompt expects
    // Children array contains tiles with positive directions (1-6)
    const structuralChildren = contextData.children.map((item) => {
      const contract = adapt.mapItem(item, userId);
      return {
        title: contract.title,
        preview: contract.preview ?? undefined,
        coords: contract.coords,
      };
    });

    // Extract hexPlan content (direction-0 tile content, if exists)
    // Use nullish coalescing with empty string check to convert empty to undefined
    const hexPlanContent = contextData.hexPlan?.ref.attrs.content?.trim();
    const hexPlan = (hexPlanContent?.length ?? 0) > 0 ? hexPlanContent : undefined;

    // For root tiles (or tiles without existing hexplan), fetch all leaf tasks
    // This enables root hexplan generation with complete leaf task list
    const hasSubtasks = structuralChildren.length > 0;
    const allLeafTasks = hasSubtasks && !hexPlan
      ? await this._fetchAllLeafTasks(centerCoord, userId, requester)
      : undefined;

    return {
      task,
      ancestors,
      composedChildren,
      structuralChildren,
      hexPlan,
      allLeafTasks,
    };
  }

  /**
   * Fetch all ancestors from root to parent (top-down order).
   * Used for context drilling - parent content flows to children.
   */
  private async _fetchAncestors(
    coords: { path: number[]; userId: string; groupId: number },
    userId: string,
    requester: RequesterContext
  ): Promise<HexecuteContext['ancestors']> {
    const ancestors: HexecuteContext['ancestors'] = [];
    let currentPath = coords.path;

    // Walk up the tree from current tile to root
    while (currentPath.length > 0) {
      const parentPath = currentPath.slice(0, -1);
      try {
        const parentCoord = { userId: coords.userId, groupId: coords.groupId, path: parentPath };
        const parent = await this.mapItemRepository.getOneByIdr(
          { idr: { attrs: { coords: parentCoord } } },
          requester
        );
        const contract = adapt.mapItem(parent, userId);
        // Add to beginning to maintain root->parent order (top-down)
        ancestors.unshift({
          title: contract.title,
          content: contract.content ?? undefined,
          coords: contract.coords,
        });
        currentPath = parentPath;
      } catch {
        break; // Parent not found, stop traversing
      }
    }

    return ancestors;
  }

  /**
   * Fetch all leaf tasks (tiles without structural children) under this tile.
   * Used for root hexplan generation - lists all executable leaf tasks.
   */
  private async _fetchAllLeafTasks(
    coords: { path: number[]; userId: string; groupId: number },
    userId: string,
    requester: RequesterContext
  ): Promise<HexecuteContext['allLeafTasks']> {
    // Get all descendants
    const descendants = await this.mapItemRepository.getDescendantsByParent({
      parentPath: coords.path,
      parentUserId: coords.userId,
      parentGroupId: coords.groupId,
      requester,
    });

    // Group by parent path to identify which tiles have structural children
    const tilesWithStructuralChildren = new Set<string>();
    for (const desc of descendants) {
      const descPath = desc.attrs.coords.path;
      const lastDirection = descPath[descPath.length - 1] as number | undefined;
      // If this is a structural child (direction 1-6), mark its parent as having children
      if (lastDirection !== undefined && lastDirection >= 1 && lastDirection <= 6) {
        const parentPath = descPath.slice(0, -1);
        tilesWithStructuralChildren.add(parentPath.join(','));
      }
    }

    // Filter to find leaf tiles (positive direction, no structural children of their own)
    const leafTasks: NonNullable<HexecuteContext['allLeafTasks']> = [];
    for (const desc of descendants) {
      const descPath = desc.attrs.coords.path;
      const lastDirection = descPath[descPath.length - 1] as number | undefined;

      // Only include structural children (directions 1-6), not context (-1 to -6) or hexplan (0)
      if (lastDirection === undefined || lastDirection < 1 || lastDirection > 6) continue;

      // Check if this tile has its own structural children
      const pathKey = descPath.join(',');
      if (tilesWithStructuralChildren.has(pathKey)) continue; // Parent tile, not a leaf

      const contract = adapt.mapItem(desc, userId);
      leafTasks.push({
        title: contract.title,
        coords: contract.coords,
      });
    }

    return leafTasks.length > 0 ? leafTasks : undefined;
  }
}
