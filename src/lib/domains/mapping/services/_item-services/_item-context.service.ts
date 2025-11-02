import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { MapItemContract } from "~/lib/domains/mapping/types/contracts";

/**
 * Strategy for fetching context around a center tile
 */
export interface ContextStrategy {
  includeParent: boolean;       // Include parent tile
  includeComposed: boolean;      // Include direction 0 tiles
  includeChildren: boolean;      // Include depth 1 children
  includeGrandchildren: boolean; // Include depth 2 grandchildren
}

/**
 * Context data for AI operations
 * Contains center tile plus surrounding tiles based on strategy
 */
export interface MapContext {
  center: MapItemContract;
  parent: MapItemContract | null;
  composed: MapItemContract[];     // Direction 0 tiles
  children: MapItemContract[];     // Depth 1 from center
  grandchildren: MapItemContract[]; // Depth 2 from center
}

/**
 * Predefined context strategies for common use cases
 */
export const ContextStrategies = {
  /**
   * Minimal context: just center + parent
   */
  MINIMAL: {
    includeParent: true,
    includeComposed: false,
    includeChildren: false,
    includeGrandchildren: false,
  } as ContextStrategy,

  /**
   * Standard context: center + parent + composed + children
   */
  STANDARD: {
    includeParent: true,
    includeComposed: true,
    includeChildren: true,
    includeGrandchildren: false,
  } as ContextStrategy,

  /**
   * Extended context: all levels
   */
  EXTENDED: {
    includeParent: true,
    includeComposed: true,
    includeChildren: true,
    includeGrandchildren: true,
  } as ContextStrategy,

  /**
   * Focused context: no parent, no grandchildren
   */
  FOCUSED: {
    includeParent: false,
    includeComposed: true,
    includeChildren: true,
    includeGrandchildren: false,
  } as ContextStrategy,
} as const;

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
   * Get context around a center tile
   *
   * Uses optimized single-query approach that:
   * - Fetches all needed tiles in one database query
   * - Excludes direction 0 paths from children/grandchildren
   * - Avoids redundant data fetching
   *
   * @param centerCoordId - Coordinate ID of the center tile
   * @param strategy - Which surrounding tiles to include
   * @returns MapContext with center and surrounding tiles
   */
  async getContextForCenter(
    centerCoordId: string,
    strategy: ContextStrategy
  ): Promise<MapContext> {
    // Parse center coordinates
    const centerCoord = CoordSystem.parseId(centerCoordId);
    const userId = centerCoord.userId;

    // Use optimized repository method - single query with pattern matching
    const contextData = await this.actions.mapItems.getContextForCenter({
      centerPath: centerCoord.path,
      userId: centerCoord.userId,
      groupId: centerCoord.groupId,
      includeParent: strategy.includeParent,
      includeComposed: strategy.includeComposed,
      includeChildren: strategy.includeChildren,
      includeGrandchildren: strategy.includeGrandchildren,
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

}
