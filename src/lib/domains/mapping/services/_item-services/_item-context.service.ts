import type {
  MapItemRepository,
  BaseItemRepository,
} from "~/lib/domains/mapping/_repositories";
import { MapItemActions } from "~/lib/domains/mapping/_actions";
import { adapt } from "~/lib/domains/mapping/types/contracts";
import {
  CoordSystem,
  type ContextStrategy,
  type MapContext,
} from "~/lib/domains/mapping/utils";

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
   * @param requesterUserId - The user making the request (for visibility filtering)
   * @returns MapContext with center and surrounding tiles
   */
  async getContextForCenter(
    centerCoordId: string,
    strategy: ContextStrategy,
    requesterUserId?: string
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
      requesterUserId,
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
