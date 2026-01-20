import type { ItemQueryService } from "~/lib/domains/mapping/services/_item-services";
import { CoordSystem, Direction } from "~/lib/domains/mapping/utils";

/**
 * Result of finding the next incomplete leaf tile
 */
export interface NextLeafResult {
  /** Coordinates of the next incomplete leaf, or null if all complete */
  leafCoords: string | null;
  /** All leaf coordinates in traversal order */
  allLeafCoords: string[];
}

/**
 * Dependencies required by LeafTraversalService
 */
export interface LeafTraversalServiceDeps {
  itemQueryService: ItemQueryService;
}

/**
 * Service for traversing tile hierarchies to find leaf tiles.
 *
 * A leaf tile is a tile that has no structural children (directions 1-6).
 * Composed children (directions -1 to -6) and hexplan children (direction 0)
 * are not considered when determining if a tile is a leaf.
 */
export class LeafTraversalService {
  private readonly itemQueryService: ItemQueryService;

  constructor(deps: LeafTraversalServiceDeps) {
    this.itemQueryService = deps.itemQueryService;
  }

  /**
   * Get all leaf tiles under a root coordinate.
   *
   * Traverses the hierarchy depth-first in direction order (1, 2, 3, 4, 5, 6).
   * Returns coordinates of tiles that have no structural children.
   * The root itself is not included even if it has no children.
   *
   * @param rootCoords - The root coordinate ID to start traversal from
   * @returns Array of leaf coordinate IDs in traversal order
   */
  async getAllLeafTiles(rootCoords: string): Promise<string[]> {
    const leaves: string[] = [];
    await this._collectLeavesUnderRoot(rootCoords, leaves);
    return leaves;
  }

  /**
   * Get the next incomplete leaf tile.
   *
   * Traverses the hierarchy to find the first leaf that is not in the
   * completedCoords set.
   *
   * @param rootCoords - The root coordinate ID to start traversal from
   * @param completedCoords - Set of coordinate IDs that have been completed
   * @returns Result containing the next leaf coords (or null) and all leaf coords
   */
  async getNextIncompleteLeaf(
    rootCoords: string,
    completedCoords: Set<string>
  ): Promise<NextLeafResult> {
    const allLeafCoords = await this.getAllLeafTiles(rootCoords);

    // Find first leaf not in completed set
    const nextLeaf = allLeafCoords.find(
      (leafCoord) => !completedCoords.has(leafCoord)
    );

    return {
      leafCoords: nextLeaf ?? null,
      allLeafCoords,
    };
  }

  /**
   * Collect leaf tiles under a root coordinate.
   * The root itself is not included in the results.
   */
  private async _collectLeavesUnderRoot(
    rootCoordId: string,
    leaves: string[]
  ): Promise<void> {
    const rootCoord = CoordSystem.parseId(rootCoordId);
    const rootItem = await this.itemQueryService.getItemByCoords({
      coords: rootCoord,
    });

    // Get structural children of the root (id is string, convert to number)
    const rootItemIdNum = parseInt(rootItem.id, 10);
    const rootStructuralChildren = await this._getStructuralChildren(rootItemIdNum);

    // If root has no children, return empty (root itself is not a leaf)
    if (rootStructuralChildren.length === 0) {
      return;
    }

    // Sort children by direction order and collect leaves from each
    const sortedChildren = this._sortChildrenByDirection(rootStructuralChildren);

    for (const child of sortedChildren) {
      await this._collectLeaves(child.coords, leaves);
    }
  }

  /**
   * Recursively collect leaf tiles from a given coordinate.
   * This coordinate IS included if it's a leaf.
   */
  private async _collectLeaves(
    coordId: string,
    leaves: string[]
  ): Promise<void> {
    const coord = CoordSystem.parseId(coordId);
    const item = await this.itemQueryService.getItemByCoords({ coords: coord });

    // Get structural children (directions 1-6 only)
    const itemIdNum = parseInt(item.id, 10);
    const structuralChildren = await this._getStructuralChildren(itemIdNum);

    if (structuralChildren.length === 0) {
      // This is a leaf tile
      leaves.push(coordId);
      return;
    }

    // Sort children by direction order and recurse
    const sortedChildren = this._sortChildrenByDirection(structuralChildren);

    for (const child of sortedChildren) {
      await this._collectLeaves(child.coords, leaves);
    }
  }

  /**
   * Sort children by their direction value (1, 2, 3, 4, 5, 6).
   */
  private _sortChildrenByDirection(
    children: { id: string; coords: string }[]
  ): { id: string; coords: string }[] {
    return children.sort((childA, childB) => {
      const coordA = CoordSystem.parseId(childA.coords);
      const coordB = CoordSystem.parseId(childB.coords);
      const directionA = coordA.path[coordA.path.length - 1] ?? 0;
      const directionB = coordB.path[coordB.path.length - 1] ?? 0;
      return directionA - directionB;
    });
  }

  /**
   * Get structural children (directions 1-6) for a tile.
   * Excludes composed children (negative directions) and hexplan (direction 0).
   */
  private async _getStructuralChildren(
    itemId: number
  ): Promise<{ id: string; coords: string }[]> {
    const descendants = await this.itemQueryService.getDescendants({
      itemId,
      includeComposition: false,
    });

    // Filter to only direct structural children (depth = parent depth + 1)
    // and only positive directions 1-6
    const item = await this.itemQueryService.getItemById({ itemId });
    const parentCoord = CoordSystem.parseId(item.coords);
    const parentDepth = parentCoord.path.length;

    return descendants
      .filter((descendant) => {
        const descendantCoord = CoordSystem.parseId(descendant.coords);
        const descendantDepth = descendantCoord.path.length;

        // Must be exactly one level deeper
        if (descendantDepth !== parentDepth + 1) {
          return false;
        }

        // Get the last direction (the one leading to this child)
        const lastDirection = descendantCoord.path[descendantCoord.path.length - 1];

        // Must be a structural direction (1-6)
        return (
          lastDirection !== undefined &&
          lastDirection >= Direction.NorthWest &&
          lastDirection <= Direction.West
        );
      })
      .map((descendant) => ({
        id: descendant.id,
        coords: descendant.coords,
      }));
  }
}
