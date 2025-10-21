/**
 * CoordinateResolver - Abstraction layer for virtual composition coordinates
 *
 * This module handles the concept of "virtual" composition containers:
 * - Composition containers (coordinates ending in ,0) don't exist as database items
 * - But we need to render them as if they do, using their parent item
 * - This resolver provides a clean API to get the "display item" at any coordinate
 *
 * @example
 * // Virtual composition container "1,0:3,0" doesn't exist
 * // But resolver returns parent item "1,0:3" for display
 * const resolver = new CoordinateResolver(mapItems);
 * const displayItem = resolver.getDisplayItem("1,0:3,0"); // Returns item at "1,0:3"
 */

import type { TileData } from "~/app/map/types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils";

export class CoordinateResolver {
  constructor(private mapItems: Record<string, TileData>) {}

  /**
   * Get the item to display at a coordinate.
   * For virtual composition containers (ending in ,0 with no item),
   * returns the parent item instead.
   *
   * @param coordId - The coordinate ID to resolve
   * @returns The item to display, or undefined if not found
   *
   * @example
   * resolver.getDisplayItem("1,0:3,0") // Returns item at "1,0:3" if "1,0:3,0" doesn't exist
   * resolver.getDisplayItem("1,0:3,1") // Returns item at "1,0:3,1" if it exists
   */
  getDisplayItem(coordId: string): TileData | undefined {
    let item = this.mapItems[coordId];

    // Virtual composition container - use parent item for display
    if (!item && this.isVirtualContainer(coordId)) {
      const parentCoord = CoordSystem.getParentCoord(CoordSystem.parseId(coordId));
      if (parentCoord) {
        const parentCoordId = CoordSystem.createId(parentCoord);
        item = this.mapItems[parentCoordId];
      }
    }

    return item;
  }

  /**
   * Get the actual parent item for a coordinate.
   * Handles virtual composition containers by recursively resolving to grandparent.
   *
   * @param coordId - The coordinate ID whose parent to find
   * @returns The parent item, or undefined if not found
   *
   * @example
   * // For regular child "1,0:3,1", returns item at "1,0:3"
   * resolver.getParentItem("1,0:3,1")
   *
   * // For composition child "1,0:3,0,1", parent is virtual "1,0:3,0"
   * // So recursively resolves to grandparent "1,0:3"
   * resolver.getParentItem("1,0:3,0,1")
   */
  getParentItem(coordId: string): TileData | undefined {
    const parentCoord = CoordSystem.getParentCoord(CoordSystem.parseId(coordId));
    if (!parentCoord) return undefined;

    const parentCoordId = CoordSystem.createId(parentCoord);

    // Recursive - if parent is virtual, this will resolve to grandparent
    return this.getDisplayItem(parentCoordId);
  }

  /**
   * Check if a coordinate is a virtual composition container.
   * A coordinate is virtual if:
   * - It ends with ,0 (direction 0 = composition container)
   * - No item exists at that coordinate in mapItems
   *
   * @param coordId - The coordinate ID to check
   * @returns True if this is a virtual composition container
   */
  isVirtualContainer(coordId: string): boolean {
    return coordId.endsWith(',0') && !this.mapItems[coordId];
  }

  /**
   * Check if a coordinate should be treated as "expanded".
   * Composition containers are always treated as expanded to show their frame.
   *
   * @param coordId - The coordinate ID to check
   * @param expandedItemIds - List of expanded item database IDs
   * @returns True if coordinate should render as expanded
   */
  isExpanded(coordId: string, expandedItemIds: string[]): boolean {
    // Composition containers always render as expanded
    if (this.isVirtualContainer(coordId)) {
      return true;
    }

    // Regular items check against expandedItemIds
    const item = this.mapItems[coordId];
    return item ? expandedItemIds.includes(item.metadata.dbId) : false;
  }
}
