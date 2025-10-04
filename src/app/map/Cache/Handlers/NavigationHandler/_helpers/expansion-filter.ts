import { CoordSystem } from "~/lib/domains/mapping/utils";

/**
 * Check if expanded item should be kept after navigation
 */
export function shouldKeepExpandedItem(
  expandedDbId: string,
  expandedCoordId: string | undefined,
  resolvedCoordId: string,
  newCenterDbId: string | undefined,
  newCenterDepth: number
): boolean {
  if (!expandedCoordId) return true;

  // Keep the new center itself if it's expanded
  if (newCenterDbId && expandedDbId === newCenterDbId) return true;

  // Keep descendants within 1 generation
  if (CoordSystem.isDescendant(expandedCoordId, resolvedCoordId)) {
    const expandedDepth = CoordSystem.getDepthFromId(expandedCoordId);
    const generationDistance = expandedDepth - newCenterDepth;
    return generationDistance <= 1;
  }

  // Keep ancestors
  if (CoordSystem.isAncestor(expandedCoordId, resolvedCoordId)) return true;

  // Keep siblings to preserve expansion when navigating between neighbors
  const siblings = CoordSystem.getSiblingsFromId(resolvedCoordId);
  return siblings.includes(expandedCoordId);
}
