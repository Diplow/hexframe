/**
 * Helper functions for determining Canvas loading states
 */

import type { TileData } from "~/app/map/types/tile-data";

export function shouldShowLoadingState(
  isLoading: boolean,
  centerItem: TileData | undefined,
  itemsCount: number
): boolean {
  // Only show loading if:
  // 1. We're loading AND
  // 2. We don't have the center item AND
  // 3. We don't have any items at all (initial load)
  return isLoading && !centerItem && itemsCount === 0;
}
