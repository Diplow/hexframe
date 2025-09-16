import type { cacheSelectors } from "~/app/map/Cache/State/selectors";

/**
 * Create query operation callbacks for the public MapCache API
 */
export function createQueryCallbacks(selectors: ReturnType<typeof cacheSelectors>) {
  const getItem = (coordId: string) => {
    return selectors.getItem(coordId);
  };

  const getRegionItems = (centerCoordId: string, maxDepth?: number) => {
    return selectors.getRegionItems(centerCoordId, maxDepth);
  };

  const hasItem = (coordId: string) => {
    return selectors.hasItem(coordId);
  };

  const isRegionLoaded = (centerCoordId: string, maxDepth?: number) => {
    return selectors.isRegionLoaded(centerCoordId, maxDepth);
  };

  return {
    getItem,
    getRegionItems,
    hasItem,
    isRegionLoaded,
  };
}